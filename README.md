# GASTRO-X website

Source of [gastro-x.califano.xyz](https://gastro-x.califano.xyz), the website of GASTRO-X, a Marie Skłodowska-Curie Postdoctoral Fellowship hosted by the Crossmodal Research Laboratory, Department of Experimental Psychology, University of Oxford (grant agreement No 101262968).

The site is plain HTML, CSS and JavaScript. There is no build step and no framework; it is published with GitHub Pages.

## Repository structure

| Path | Content |
|---|---|
| `index.html`, `project.html`, `team.html`, `news.html`, `outputs.html` | Site pages. Each page carries its own header and footer. |
| `demo/` | "Open a fridge", the first element of the project demonstrator (deliverable D4.1). |
| `assets/style.css` | Styles for the whole site, including dark mode. |
| `assets/fonts/` | Fraunces and Inter, self-hosted under the SIL Open Font License. |
| `assets/eu-funded.png`, `assets/eu-funded-neg.png` | "Funded by the European Union" emblem, for light and dark backgrounds. |
| `404.html`, `CNAME`, `.nojekyll` | GitHub Pages configuration. |

## Demo

`demo/items.json` holds, for each of the four study countries (Italy, Germany, Poland and the United Kingdom), the food items with their national purchase weights, household waste rates and typical pack sizes. `demo/demo.js` stocks a kitchen in the browser with the rules used to build the GASTRO-X study scenarios: a common slot template, purchase-weighted draws, selection of a typical set, and at-risk items drawn in proportion to waste rates. The 20 scenarios used in the study are not part of this repository. Data sources are listed on the demo page.

## Local preview

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The demo loads `demo/items.json`, so pages must be served over HTTP rather than opened directly from disk.

## Deployment

GitHub Pages publishes the `main` branch from the repository root. The custom domain is set in `CNAME`, and HTTPS is enforced. Pages link to `assets/style.css` and `demo/demo.js` with a version query (`?v=YYYYMMDD`); update it in every page when either file changes, so browsers do not serve a cached copy.

## Privacy

The site sets no cookies and loads no third-party fonts. Visits are counted with [GoatCounter](https://www.goatcounter.com), which does not use cookies or collect personal data.

## Funding

This project has received funding from the European Union's Horizon Europe research and innovation programme under the Marie Skłodowska-Curie grant agreement No 101262968. Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or the European Research Executive Agency (REA). Neither the European Union nor the granting authority can be held responsible for them.

The emblem, funding statement and disclaimer in the footer of every page are required by the grant agreement (Article 17) and must not be removed.

## Contact

Giovanbattista Califano, giovanbattista.califano@psy.ox.ac.uk
