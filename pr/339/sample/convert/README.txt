# Gram Applet to DITA Conversion (Browser-Based)

This ZIP includes:

- `gram-sample.html`: A mock legacy HTML file with a `<title>` and `<applet>` block
- `gram2dita.xsl`: An XSLT stylesheet that transforms the HTML into DITA XML

## How to Use

1. Open `gram-sample.html` in Firefox or Internet Explorer (Chrome blocks XSLT for local files)
2. You will see a DITA-formatted XML document generated from the `<applet>` parameters
3. You can copy this result and paste into a `.dita` file in OxygenXML

## Notes

- This assumes single-value `<param>` entries only.
- You can replicate this setup for other HTML files by pointing them to the same `gram2dita.xsl` stylesheet.
