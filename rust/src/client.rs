use anyhow::{Context, Result};
use dashmap::DashMap;
use once_cell::sync::Lazy;
use serde_json::Value;
use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::Duration;
use tokio::runtime::Runtime;
use wreq::{Client as HttpClient, Proxy};
use wreq_util::Emulation;

const CLIENT_CACHE_LIMIT: usize = 1024;
const TIMEOUT_BUCKET_MS: u64 = 5_000;

pub static HTTP_RUNTIME: Lazy<Runtime> = Lazy::new(|| {
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to create shared HTTP runtime")
});

static CLIENT_CACHE: Lazy<ClientCache> = Lazy::new(ClientCache::new);

struct ClientCache {
    clients: DashMap<ClientKey, Arc<HttpClient>>,
    order: StdMutex<VecDeque<ClientKey>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct ClientKey {
    emulation: String,
    proxy: Option<String>,
    timeout_bucket: u64,
}

impl ClientCache {
    fn new() -> Self {
        Self {
            clients: DashMap::new(),
            order: StdMutex::new(VecDeque::new()),
        }
    }

    fn get_or_try_insert<F>(&self, key: ClientKey, builder: F) -> Result<Arc<HttpClient>>
    where
        F: FnOnce() -> Result<HttpClient>,
    {
        if let Some(entry) = self.clients.get(&key) {
            let client = entry.clone();
            drop(entry);
            self.bump_key(&key);
            return Ok(client);
        }

        let client = Arc::new(builder()?);
        self.clients.insert(key.clone(), client.clone());
        self.bump_key(&key);
        Ok(client)
    }

    fn bump_key(&self, key: &ClientKey) {
        let mut order = self.order.lock().unwrap();
        order.retain(|existing| existing != key);
        order.push_back(key.clone());

        while order.len() > CLIENT_CACHE_LIMIT {
            if let Some(oldest) = order.pop_front() {
                self.clients.remove(&oldest);
            }
        }
    }
}

#[derive(Debug, Clone)]
pub struct RequestOptions {
    pub url: String,
    pub emulation: Emulation,
    pub headers: HashMap<String, String>,
    pub method: String,
    pub body: Option<String>,
    pub proxy: Option<String>,
    pub timeout: u64,
}

#[derive(Debug, Clone)]
pub struct Response {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub cookies: HashMap<String, String>,
    pub url: String,
}

pub async fn make_request(options: RequestOptions) -> Result<Response> {
    let client = get_or_build_client(&options)?;

    let RequestOptions {
        url,
        headers,
        method,
        body,
        timeout,
        ..
    } = options;

    let method = if method.is_empty() {
        "GET".to_string()
    } else {
        method
    };

    let method_upper = method.to_uppercase();

    // Build request
    let mut request = match method_upper.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        "HEAD" => client.head(&url),
        _ => return Err(anyhow::anyhow!("Unsupported HTTP method: {}", method_upper)),
    };

    // Apply custom headers
    for (key, value) in headers {
        request = request.header(&key, &value);
    }

    // Apply body if present
    if let Some(body) = body {
        request = request.body(body);
    }

    // Apply timeout
    request = request.timeout(Duration::from_millis(timeout));

    // Execute request
    let response = request
        .send()
        .await
        .with_context(|| format!("{} {}", method_upper, url))?;

    // Extract response data
    let status = response.status().as_u16();
    let final_url = response.uri().to_string();

    // Extract headers
    let mut response_headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(value_str) = value.to_str() {
            response_headers.insert(key.to_string(), value_str.to_string());
        }
    }

    // Extract cookies
    let mut cookies = HashMap::new();
    if let Some(cookie_header) = response.headers().get("set-cookie") {
        if let Ok(cookie_str) = cookie_header.to_str() {
            // Simple cookie parsing (name=value)
            for cookie_part in cookie_str.split(';') {
                if let Some((key, value)) = cookie_part.trim().split_once('=') {
                    cookies.insert(key.to_string(), value.to_string());
                }
            }
        }
    }

    // Get body
    let body = response
        .text()
        .await
        .context("Failed to read response body")?;

    Ok(Response {
        status,
        headers: response_headers,
        body,
        cookies,
        url: final_url,
    })
}

fn get_or_build_client(options: &RequestOptions) -> Result<Arc<HttpClient>> {
    let key = ClientKey {
        emulation: emulation_label(&options.emulation),
        proxy: options.proxy.clone(),
        timeout_bucket: bucket_timeout(options.timeout),
    };

    CLIENT_CACHE.get_or_try_insert(key, || build_client(options))
}

fn build_client(options: &RequestOptions) -> Result<HttpClient> {
    let mut client_builder = HttpClient::builder()
        .emulation(options.emulation.clone())
        .cookie_store(true);

    if let Some(proxy_url) = options.proxy.as_deref() {
        let proxy = Proxy::all(proxy_url).context("Failed to create proxy")?;
        client_builder = client_builder.proxy(proxy);
    }

    client_builder
        .build()
        .context("Failed to build HTTP client")
}

fn bucket_timeout(timeout: u64) -> u64 {
    let buckets = (timeout + TIMEOUT_BUCKET_MS - 1) / TIMEOUT_BUCKET_MS;
    buckets.max(1) * TIMEOUT_BUCKET_MS
}

fn emulation_label(emulation: &Emulation) -> String {
    match serde_json::to_value(emulation) {
        Ok(Value::String(label)) => label,
        _ => "chrome_142".to_string(),
    }
}
