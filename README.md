# GASTRO-X website

Source of https://gastro-x.califano.xyz, the public site of the MSCA Postdoctoral Fellowship GASTRO-X (grant agreement No 101262968). Plain HTML and CSS, no build step, served by GitHub Pages.

## Setup (once)

1. Create a public repository `gastro-x` and push these files to `main`.
2. Settings → Pages: deploy from branch `main`, folder `/ (root)`.
3. At the DNS provider for califano.xyz, add a CNAME record: `gastro-x` → `<github-username>.github.io`.
4. Settings → Pages → Custom domain: `gastro-x.califano.xyz` (the `CNAME` file already contains it), then tick "Enforce HTTPS" once the certificate is issued.

## Structure

- `index.html`, `project.html`, `team.html`, `news.html`, `outputs.html`: pages; header and footer are repeated in each file.
- `demo/`: placeholder for the demo app (D4.1). Keep the demo in this repository so it is served at gastro-x.califano.xyz/demo.
- `assets/style.css`: all styling, light and dark mode ("menu card" design).
- `assets/fonts/`: Fraunces (headings) and Inter (text), self-hosted (SIL Open Font License), so the site makes no requests to Google.
- `assets/eu-funded.png`, `assets/eu-funded-neg.png`: official "Funded by the European Union" emblem (positive and negative for dark mode).
- Analytics: GoatCounter, site code `gastro-x` (the script tag in each page's `<head>`).

## EU visibility (Grant Agreement, Art. 17.2 and 17.3)

Every page carries the EU emblem, the funding statement and the disclaimer in the footer. Do not remove or alter them.

## Adding a news item

Pages are generated once from a template; after that, edit the HTML directly.


Copy an `<article class="news-item">` block to the top of `news.html` with a new `id`, and update the "Latest news" block in `index.html`.
