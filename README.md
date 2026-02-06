# Scrapex

## Introduction

Scrapex is a versatile scraping component designed to efficiently extract content from URLs. Leveraging the power of Playwright and Chrome, it ensures seamless support for Single Page Applications (SPAs) and content dependent on JavaScript execution. Initially developed for internal use by our AI Agents, Scrapex offers robust functionality for a wide range of scraping needs.

## Features

-   _Support for Multiple Output Formats_: Scrapex can output data in HTML, Markdown, or PDF formats, catering to diverse requirements.
-   _Container Image deployment_: For ease of deployment and scalability, Scrapex is fully compatible with Container environments such as Docker or Kubernetes.
-   _Customizable Settings_: Through environment variables, as well as parameters in the extraction call, users can tailor the behavior of Scrapex to suit their specific scraping tasks.

## Configuration

Scrapex supports the following output formats:

1. _HTML_: Direct extraction of HTML content.
2. _Markdown_: Full-page HTML is converted to Markdown using [Turndown](https://github.com/mixmark-io/turndown). Script, style, noscript and template attributes are removed via Turndown’s `remove()` before conversion.
3. _PDF_: Generation of PDF documents utilizing Playwright's PDF functionality.
4. _Screenshot_: Full-page screenshot generation utilizing Playwright's screenshot functionality.

### Environment Variables

Configure Scrapex using the following environment variables:

| Variable             | Description                                      | Default                                                                                                             |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `PORT`               | Port on which Node.js server listens             | `3000`                                                                                                              |
| `DEFAULT_WAIT`       | Default milliseconds to wait on page load        | `0`                                                                                                                 |
| `DEFAULT_USER_AGENT` | Default user agent for requests                  | `"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"` |
| `LOG_LEVEL`          | Logging level (`debug`, `info`, `warn`, `error`) | `debug`                                                                                                             |

## How to Run

The simplest way to run Scrapex is using Docker. Here's an example `docker-compose.yaml`:

```yaml
version: "3"
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

## Usage Example

To test Scrapex, you can send a request using curl as shown below:

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

### Payload Parameters

The following table describes the parameters included in the payload of the `curl` example:
| Parameter | Description | Example |
|--------------|-------------------------------------------|---------------------------------------------------|
| url | URL of the page to scrape | https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon |
| outputType | Desired output format | html / md / pdf / screenshot |
| wait | Milliseconds to wait before extraction | 2000 |
| userAgent | User agent to use for the request | Mozilla/5.0 (Windows NT 10.0; Win64; x64)... |
| settings | Additional settings for output formatting | { "pdf": { "options": { "format": "A4" } } } |

### Settings per extraction Type

#### PDF

All available values for `settings -> pdf -> options` can be found at: https://playwright.dev/docs/api/class-page#page-pdf

#### Markdown (MD)

Full-page HTML is converted with [Turndown](https://github.com/mixmark-io/turndown). Before conversion, `script`, `style`, `noscript`, and `template` tags are removed. No MD-specific settings.

#### Screenshot

All available values for `settings -> screenshot -> options` can be found at: https://playwright.dev/docs/api/class-page#page-screenshot
