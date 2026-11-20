<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    exclude-result-prefixes="xhtml">

  <xsl:output method="xml" indent="yes"/>

  <xsl:template match="/xhtml:html">
    <topic id="gram-auto">
      <title>
        <xsl:value-of select="xhtml:head/xhtml:title"/>
      </title>
      <body>
        <table frame="all">
          <tgroup cols="3">
            <thead>
              <row>
                <entry namest="c1" nameend="c3">
                  <image href="{xhtml:body/xhtml:applet/xhtml:param[@name='image']/@value}"/>
                </entry>
              </row>
              <row>
                <entry>Param</entry>
                <entry colspan="2">Value</entry>
              </row>
            </thead>
            <tbody>
              <xsl:for-each select="xhtml:body/xhtml:applet/xhtml:param[@name!='image']">
                <row>
                  <entry><xsl:value-of select="@name"/></entry>
                  <entry colspan="2"><xsl:value-of select="@value"/></entry>
                </row>
              </xsl:for-each>
            </tbody>
          </tgroup>
        </table>
      </body>
    </topic>
  </xsl:template>
</xsl:stylesheet>
