package com.iflytek.astron.console.hub.util.wechat;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.HashMap;
import java.util.Map;

/**
 * XMLParse class Provides interfaces for extracting encrypted messages from message formats and
 * generating reply message formats.
 */
public class XMLParse {

    /**
     * Extract encrypted message from XML data package
     *
     * @param xmltext XML string to extract from
     * @param keys Keys to extract
     * @return Extracted encrypted message string
     * @throws AesException
     */
    public static Map<String, String> extract(String xmltext, String[] keys) throws AesException {
        HashMap<String, String> result = new HashMap<>();
        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            // Prevent XXE attacks by disabling external entity processing
            dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
            dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            dbf.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            dbf.setXIncludeAware(false);
            dbf.setExpandEntityReferences(false);
            DocumentBuilder db = dbf.newDocumentBuilder();
            StringReader sr = new StringReader(xmltext);
            InputSource is = new InputSource(sr);
            Document document = db.parse(is);
            Element root = document.getDocumentElement();
            for (String key : keys) {
                NodeList nodeList = root.getElementsByTagName(key);
                if (nodeList.getLength() > 0) {
                    result.put(key, nodeList.item(0).getTextContent());
                }
            }
            return result;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AesException(AesException.ParseXmlError);
        }
    }

    /**
     * Generate XML message
     *
     * @param encrypt Encrypted message ciphertext
     * @param signature Security signature
     * @param timestamp Timestamp
     * @param nonce Random string
     * @return Generated XML string
     */
    public static String generate(String encrypt, String signature, String timestamp, String nonce) {
        String format = "<xml>%n" + "<Encrypt><![CDATA[%1$s]]></Encrypt>%n"
                + "<MsgSignature><![CDATA[%2$s]]></MsgSignature>%n"
                + "<TimeStamp>%3$s</TimeStamp>%n" + "<Nonce><![CDATA[%4$s]]></Nonce>%n" + "</xml>";
        return String.format(format, encrypt, signature, timestamp, nonce);
    }
}
