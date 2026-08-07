package com.iflytek.astron.console.toolkit.util;

import lombok.extern.slf4j.Slf4j;

import java.net.URI;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

/**
 * Utility class for handling URI-related operations.
 * <p>
 * This class provides a helper method to extract query parameters from a given {@link URI}. The
 * parameters are decoded using UTF-8 encoding.
 * </p>
 *
 * <p>
 * <b>Usage example:</b>
 * </p>
 *
 * <pre>
 * URI uri = new URI("https://example.com/api?name=Tom&age=20");
 * Map&lt;String, String&gt; params = URIUtils.getQueryParameters(uri);
 * // params.get("name") -> "Tom"
 * // params.get("age") -> "20"
 * </pre>
 *
 * <p>
 * All exceptions are logged without interruption of the main process.
 * </p>
 *
 * @author
 * @since 2025/10/09
 */
@Slf4j
public class URIUtils {

    /**
     * Parses the query string from a given {@link URI} and returns a map of decoded parameters.
     * <p>
     * The method safely handles invalid encodings and malformed queries by catching exceptions and
     * logging the error without throwing further.
     * </p>
     *
     * @param uri the {@link URI} object containing the query string; must not be {@code null}
     * @return a {@link Map} containing decoded query parameters (key-value pairs); if no query
     *         parameters are present or an error occurs, an empty map is returned
     * @throws None this method catches and logs all exceptions internally
     */
    public static Map<String, String> getQueryParameters(URI uri) {
        Map<String, String> queryParams = new HashMap<>();

        try {
            String query = uri.getRawQuery();

            if (query != null) {
                String[] queryParamsArray = query.split("&");

                for (String param : queryParamsArray) {
                    String[] keyValue = param.split("=");

                    if (keyValue.length >= 2) {
                        String paramName = URLDecoder.decode(keyValue[0], "UTF-8");
                        String paramValue = URLDecoder.decode(keyValue[1], "UTF-8");

                        queryParams.put(paramName, paramValue);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to extract query parameters from URI. Error = {}", e.getMessage(), e);
        }

        return queryParams;
    }
}
