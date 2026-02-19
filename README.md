# Scrapex

## Introduction

Scrapex is a versatile scraping component designed to efficiently extract content from URLs. Leveraging the power of Playwright and Chrome, it ensures seamless support for Single Page Applications (SPAs) and content dependent on JavaScript execution. Initially developed for internal use by our AI Agents, Scrapex offers robust functionality for a wide range of scraping needs.

## Features

-   _Support for Multiple Output Formats_: Scrapex can output data in HTML, Markdown, PDF, or Screenshot formats, catering to diverse requirements.
-   _Browser and Fetch Modes_: Use full browser rendering (Playwright) for JavaScript-heavy pages, or direct HTTP fetch for fast, lightweight extraction of HTML and Markdown.
-   _Container Image deployment_: For ease of deployment and scalability, Scrapex is fully compatible with Container environments such as Docker or Kubernetes.
-   _Customizable Settings_: Through environment variables, as well as parameters in the extraction call, users can tailor the behavior of Scrapex to suit their specific scraping tasks.

## Configuration

Scrapex supports the following output formats:

1. _HTML_: Direct extraction of HTML content. Supports both browser and fetch modes.
2. _Markdown_: Full-page HTML is converted to Markdown using [Turndown](https://github.com/mixmark-io/turndown). Script, style, noscript and template tags are removed via Turndown's `remove()` before conversion. Supports both browser and fetch modes.
3. _PDF_: Generation of PDF documents utilizing Playwright's PDF functionality. Browser mode only.
4. _Screenshot_: Full-page screenshot generation utilizing Playwright's screenshot functionality. Browser mode only.

### Extraction Modes

Scrapex supports two extraction modes, controlled by the `mode` parameter:

-   **`browser`** (default): Uses Playwright with a headless Chromium browser. Supports all output formats and handles JavaScript-rendered pages (SPAs). The `DEFAULT_WAIT` and `DEFAULT_USER_AGENT` environment variables only apply to this mode.
-   **`fetch`**: Uses a direct HTTP request instead of a browser. Significantly faster and lighter, but only supports `html` and `md` output types. Does not execute JavaScript, so it is best suited for static or server-rendered pages. No default user agent is set; pass `userAgent` in the request if the target site requires one.

### Environment Variables

Configure Scrapex using the following environment variables:

| Variable             | Description                                                  | Default                                                                                                             |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `PORT`               | Port on which Node.js server listens                         | `3000`                                                                                                              |
| `DEFAULT_WAIT`       | Default milliseconds to wait on page load (browser mode only)| `0`                                                                                                                 |
| `DEFAULT_USER_AGENT` | Default user agent for requests (browser mode only)          | `"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"` |
| `LOG_LEVEL`          | Logging level (`debug`, `info`, `warn`, `error`)             | `debug`                                                                                                             |

## How to Run

The simplest way to run Scrapex is using Docker. Here's an example `docker-compose.yaml`:

```yaml
services:
    app:
        container_name: scrapex
        image: ghcr.io/cloudx-labs/scrapex:latest # it's better to pin down to a specific release version such as v0.1
        environment:
            - TZ=America/Argentina/Buenos_Aires
            - PORT=3000
            - LOG_LEVEL=debug
        ports:
            - "3003:3000"
```

## Usage Examples

### Browser mode (default)

Extract a PDF using the full browser engine:

```bash
curl --location 'http://localhost:3003/extract' \
--header 'Content-Type: application/json' \
--data '{
    "url": "https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon",
    "outputType": "pdf",
    "wait": 0,
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "settings": {
        "pdf": {
            "options": {
                "format": "A4"
            }
        }
    }
}'
```

### Fetch mode

Extract Markdown using a fast direct HTTP fetch (no browser overhead):

```bash
curl --location 'http://localhost:3003/extract' \
--header 'Content-Type: application/json' \
--data '{
    "url": "https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon",
    "outputType": "md",
    "mode": "fetch"
}'
```

### Payload Parameters

The following table describes the parameters included in the payload:
| Parameter  | Description                               | Example                                              |
|------------|-------------------------------------------|------------------------------------------------------|
| url        | URL of the page to scrape                 | https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon |
| outputType | Desired output format                     | html / md / pdf / screenshot                         |
| mode       | Extraction mode                           | `browser` (default) / `fetch`                        |
| wait       | Milliseconds to wait before extraction (browser mode only) | 2000                              |
| userAgent  | User agent to use for the request         | Mozilla/5.0 (Windows NT 10.0; Win64; x64)...        |
| settings   | Additional settings for output formatting | { "pdf": { "options": { "format": "A4" } } }        |

### Settings per extraction Type

#### PDF

All available values for `settings -> pdf -> options` can be found at: https://playwright.dev/docs/api/class-page#page-pdf

#### Markdown (MD)

Full-page HTML is converted with [Turndown](https://github.com/mixmark-io/turndown). Before conversion, `script`, `style`, `noscript`, and `template` tags are removed. No MD-specific settings.

#### Screenshot

All available values for `settings -> screenshot -> options` can be found at: https://playwright.dev/docs/api/class-page#page-screenshot
