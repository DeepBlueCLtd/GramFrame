
# Strategy for Converting Legacy HTML to DITA with Gram Component Table Layout

## ✅ Objective
Convert each HTML page to a DITA topic that:
- Captures the **document title**
- Includes a **configuration table** for the component:
  - First row: spectrogram image in a merged table cell
  - Following rows: parameter name and value (time-start, time-end, freq-start, freq-end)

---

## 🧰 Tools Available
- **OxygenXML** for authoring, validation, and final refinement
- **WinPython** for parsing and automation (e.g. using BeautifulSoup)
- **Notepad++** for sampling, quick inspection, and regex-based fixes

---

## 🛠 Conversion Workflow

### 1. Audit & Pattern Recognition
- Review 5–10 sample HTML files
- Confirm:
  - How titles are marked (e.g. `<title>`, `<h1>`)
  - How spectrogram config tables are structured (`<table class="gram-frame">`)
  - Location of spectrogram image and `<param>`-style entries

---

### 2. Python-Based Extraction
Write a script using `BeautifulSoup` to:
- Parse each HTML file
- Extract:
  - Title
  - Spectrogram image name (from `<img>` in first row of the config table)
  - Parameter rows: `[name, value]` (using 2-column format, NOT 3-column)

Then generate a `.dita` file with the following structure:

```xml
<topic id="gram-xyz">
  <title>Page Title</title>
  <body>
    <table frame="all">
      <tgroup cols="3">
        <thead>
          <row>
            <entry namest="c1" nameend="c3">
              <image href="spectrograms/foo123.png"/>
            </entry>
          </row>
          <row>
            <entry>Param</entry>
            <entry>Min</entry>
            <entry>Max</entry>
          </row>
        </thead>
        <tbody>
          <row><entry>RPM (rev/min)</entry><entry>5</entry><entry>50</entry></row>
          <!-- additional rows -->
        </tbody>
      </tgroup>
    </table>
  </body>
</topic>
```

---

### 3. Review & Validate in OxygenXML
- Validate DITA structure
- Fix any anomalies
- Use DITA Maps to organize and publish

---

## 🧩 Optional Enhancements
- Store the `rate` or other config values as DITA metadata or `data-` attributes
- Assign consistent `id` attributes to `<table>` or `<topic>` elements
- Add `<prolog>` info for traceability

---

Let me know if you want the Python script template or a sample `.dita` output to get started.
