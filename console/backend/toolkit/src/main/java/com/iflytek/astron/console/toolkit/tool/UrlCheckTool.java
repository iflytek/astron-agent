package com.iflytek.astron.console.toolkit.tool;

import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.util.ssrf.SsrfValidators;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * URL security validation tool.
 *
 * <p>
 * Responsibilities:
 * </p>
 * <ul>
 * <li>Restricts protocols to HTTP/HTTPS;</li>
 * <li>Prohibits user information (user:pass@host format);</li>
 * <li>Rejects IPv6 and IPv4-mapped IPv6 (can be relaxed as needed);</li>
 * <li>Resolves a bounded redirect chain and performs blacklist/whitelist validation on each
 * hop;</li>
 * <li>Blocks common short link domains;</li>
 * <li>Supports IP blacklist, network segment blacklist, and domain whitelist (configuration source:
 * ConfigInfo table).</li>
 * </ul>
 *
 * <p>
 * Note: External public method signatures remain unchanged, internal implementation enhanced for
 * robustness and readability.
 * </p>
 *
 * @author astron-console-toolkit
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UrlCheckTool {

    private final ConfigInfoMapper configInfoMapper;

    // ===== Configuration category constants =====
    private static final String IP_CATEGORY = "IP_BLACK_LIST";
    private static final String NETWORK_SEGMENT_CATEGORY = "NETWORK_SEGMENT_BLACK_LIST";
    private static final String DOMAIN_WHITE_CATEGORY = "DOMAIN_WHITE_LIST";
    private static final String IP_WHITE_CATEGORY = "IP_WHITE_LIST";

    // ===== Other constants =====
    private static final int CONNECT_TIMEOUT_MS = (int) Duration.ofSeconds(5).toMillis();
    private static final int READ_TIMEOUT_MS = (int) Duration.ofSeconds(5).toMillis();
    private static final int MAX_REDIRECTS = 5;
    private static final Pattern DOMAIN_PATTERN = Pattern.compile("https?://([^/]+)", Pattern.CASE_INSENSITIVE);
    private static final Set<Integer> REDIRECT_STATUS_CODES = Set.of(301, 302, 303, 307, 308);

    // Common short link domains
    private static final Set<String> SHORT_LINK_DOMAINS = Set.of(
            "bit.ly", "tinyurl.com", "t.co", "rebrandly.com", "is.gd", "t.ly",
            "monojson.com", "t.cn", "url.cn", "dwz.cn");

    /**
     * Gets the direct redirected URL without following it automatically.
     *
     * <p>
     * Implementation details: Uses HEAD method only, disables auto-follow, and only retrieves the
     * Location header.
     * </p>
     *
     * @param url the original URL to check for redirects
     * @return the redirected URL if redirect found, otherwise the original URL
     */
    public String getRedirectUrl(String url) {
        return getRedirectUrl(url, readCsvConfig(IP_WHITE_CATEGORY));
    }

    protected String getRedirectUrl(String url, List<String> ipWhiteList) {
        if (StringUtils.isBlank(url))
            return url;

        try {
            RedirectLookupResult result = lookupRedirect(url, ipWhiteList);
            if (REDIRECT_STATUS_CODES.contains(result.statusCode)
                    && StringUtils.isNotBlank(result.location)) {
                return new URL(new URL(url), result.location).toString();
            }
        } catch (IOException e) {
            // Use original URL on network exception
            log.debug("getRedirectUrl error: {}", e.toString());
        }
        return url;
    }

    private RedirectLookupResult lookupRedirect(String url, List<String> ipWhiteList) throws IOException {
        HttpURLConnection conn = null;
        try {
            URL u = toSafeHttpUrl(url);
            ensurePublicAddresses(u.getHost(), ipWhiteList);
            URLConnection urlConnection = u.openConnection();
            if (!(urlConnection instanceof HttpURLConnection httpURLConnection)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_HTTP_HTTPS_ONLY);
            }
            conn = httpURLConnection;
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(CONNECT_TIMEOUT_MS);
            conn.setReadTimeout(READ_TIMEOUT_MS);
            conn.setRequestMethod("HEAD");
            int code = conn.getResponseCode();
            return new RedirectLookupResult(code, conn.getHeaderField("Location"));
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    /**
     * Throws exception if URL host is IPv6 (current policy: disable IPv6). Silently returns on parsing
     * exception (doesn't affect main flow).
     *
     * @param url the URL to check for IPv6
     * @throws BusinessException if the URL host is IPv6 or malformed
     */
    public static void checkUrlForIPv6(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();
            if (host == null) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
            InetAddress inet = InetAddress.getByName(host);
            if (inet instanceof Inet6Address) {
                log.info("URL host is IPv6: {}", host);
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception ignore) {
            // Parsing failure not handled here, let upper layer handle uniformly
        }
    }

    /**
     * Rejects IPv4-mapped IPv6 address format, such as: http://[::ffff:192.168.1.1]/path
     *
     * @param url the URL to check for IPv4-mapped IPv6 format
     * @throws BusinessException if the URL contains IPv4-mapped IPv6 format
     */
    public static void IPv4MappedCheck(String url) {
        String regex = "^https?://\\[::ffff:(\\d{1,3}\\.){3}\\d{1,3}\\](/.*)?$";
        if (StringUtils.isNotBlank(url) && url.matches(regex)) {
            throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
        }
    }

    /**
     * Blacklist/whitelist validation (considering a bounded redirect chain).
     * <ol>
     * <li>First validate the original URL before any connection;</li>
     * <li>Domain in whitelist → allow;</li>
     * <li>Resolve A record to get IPv4/IPv6 (this policy focuses on IPv4 validation);</li>
     * <li>Hit IP blacklist → reject;</li>
     * <li>Hit network segment blacklist (CIDR) → reject;</li>
     * <li>Then inspect redirects and validate every redirected URL before proceeding.</li>
     * </ol>
     * Silently returns on parsing exception (doesn't affect main flow), let upper layer handle
     * uniformly.
     *
     * @param url the URL to validate against blacklists and whitelists
     * @throws BusinessException if the URL is blacklisted
     */
    public void checkBlackList(String url) {
        try {
            List<String> ipBlackList = readCsvConfig(IP_CATEGORY);
            List<String> segmentBlackList = readCsvConfig(NETWORK_SEGMENT_CATEGORY);
            List<String> domainWhiteList = readCsvConfig(DOMAIN_WHITE_CATEGORY);
            List<String> ipWhiteList = readCsvConfig(IP_WHITE_CATEGORY);

            String currentUrl = url;
            Set<String> visitedUrls = new HashSet<>();
            for (int i = 0; i <= MAX_REDIRECTS; i++) {
                validateUrlPolicy(
                        currentUrl, ipBlackList, segmentBlackList, domainWhiteList, ipWhiteList);
                if (!visitedUrls.add(currentUrl)) {
                    throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
                }

                String redirectUrl = getRedirectUrl(currentUrl, ipWhiteList);
                if (currentUrl.equals(redirectUrl)) {
                    return;
                }
                currentUrl = redirectUrl;
            }
            throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.debug("checkBlackList error: {}", e.toString());
            throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
        }
    }

    private void validateUrlPolicy(String url, List<String> ipBlackList,
            List<String> segmentBlackList,
            List<String> domainWhiteList,
            List<String> ipWhiteList) throws Exception {
        checkHttpOrHttps(url);
        symbolCheck(url);
        IPv4MappedCheck(url);
        checkUrlForIPv6(url);
        resolveShortLink(url);
        validateUrlAgainstBlacklist(
                url, ipBlackList, segmentBlackList, domainWhiteList, ipWhiteList);
    }

    /**
     * Internal helper to validate a URL against blacklist/whitelist without making connections.
     *
     * @param url the URL to validate
     * @param ipBlackList list of blacklisted IPs
     * @param segmentBlackList list of blacklisted network segments
     * @param domainWhiteList list of whitelisted domains
     * @throws BusinessException if validation fails
     */
    private void validateUrlAgainstBlacklist(String url, List<String> ipBlackList,
            List<String> segmentBlackList,
            List<String> domainWhiteList,
            List<String> ipWhiteList) throws Exception {
        URI uri = new URI(url);
        String host = uri.getHost();
        if (StringUtils.isBlank(host))
            return;

        // Whitelist (case insensitive)
        String asciiHost = IDN.toASCII(host).toLowerCase(Locale.ROOT);
        for (String white : domainWhiteList) {
            if (asciiHost.equalsIgnoreCase(StringUtils.trimToEmpty(white))) {
                return;
            }
        }

        InetAddress[] addresses = InetAddress.getAllByName(asciiHost);
        if (addresses.length == 0) {
            throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
        }
        for (InetAddress inet : addresses) {
            if (SsrfValidators.isIpLiteral(asciiHost)
                    && SsrfValidators.isAddressMatchedByIpRules(inet, ipWhiteList)) {
                log.debug("URL destination allowed by IP whitelist, host={}, ip={}", asciiHost, inet.getHostAddress());
                continue;
            }
            if (SsrfValidators.isRestrictedAddress(inet)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
            String ip = inet.getHostAddress();

            // IPv4 blacklist
            if (ipBlackList.stream().map(String::trim).anyMatch(ip::equals)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_IP_IN_BLACKLIST);
            }

            // Network segment blacklist (only effective for IPv4; IPv6 can be extended)
            if (inet instanceof Inet4Address) {
                for (String segment : segmentBlackList) {
                    if (isIpInRange(ip, segment)) {
                        throw new BusinessException(ResponseEnum.TOOLBOX_IP_IN_BLACKLIST);
                    }
                }
            }
        }
    }

    /**
     * Determines if IPv4 falls within CIDR range (like 10.0.0.0/8). Returns false directly for invalid
     * segments or IPv6 scenarios.
     *
     * @param ip the IP address to check
     * @param segment the CIDR network segment
     * @return true if IP is in the network range, false otherwise
     * @throws UnknownHostException if IP address cannot be resolved
     */
    private boolean isIpInRange(String ip, String segment) throws UnknownHostException {
        if (StringUtils.isBlank(ip) || StringUtils.isBlank(segment))
            return false;

        String[] parts = segment.split("/");
        if (parts.length != 2)
            return false;

        String subnet = parts[0].trim();
        int prefixLength;
        try {
            prefixLength = Integer.parseInt(parts[1].trim());
        } catch (NumberFormatException nfe) {
            return false;
        }
        if (prefixLength < 0 || prefixLength > 32)
            return false;

        InetAddress ipAddr = InetAddress.getByName(ip);
        InetAddress subnetAddr = InetAddress.getByName(subnet);
        if (!(ipAddr instanceof Inet4Address) || !(subnetAddr instanceof Inet4Address)) {
            return false;
        }

        byte[] ipBytes = ipAddr.getAddress();
        byte[] subnetBytes = subnetAddr.getAddress();

        int byteCount = prefixLength / 8;
        int bitCount = prefixLength % 8;

        for (int i = 0; i < byteCount; i++) {
            if (ipBytes[i] != subnetBytes[i]) {
                return false;
            }
        }

        if (bitCount > 0) {
            int mask = 0xFF << (8 - bitCount);
            return (ipBytes[byteCount] & mask) == (subnetBytes[byteCount] & mask);
        }
        return true;
    }

    /**
     * Blocks common short links (short links easily used for redirect bypass and phishing).
     *
     * @param shortUrl the URL to check for short link domains
     * @throws IOException if URL processing fails
     * @throws BusinessException if the URL is a known short link
     */
    public void resolveShortLink(String shortUrl) throws IOException {
        if (StringUtils.isBlank(shortUrl))
            return;

        Matcher matcher = DOMAIN_PATTERN.matcher(shortUrl);
        if (matcher.find()) {
            String domain = matcher.group(1);
            String asciiDomain = IDN.toASCII(domain).toLowerCase(Locale.ROOT);
            if (SHORT_LINK_DOMAINS.contains(asciiDomain)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_SHORT_NOT_SUPPORTED);
            }
        }
    }

    /**
     * Only allows HTTP/HTTPS protocols. Silently returns on parsing exception, let upper layer handle
     * uniformly.
     *
     * @param url the URL to validate protocol
     * @throws BusinessException if protocol is not HTTP or HTTPS
     */
    public void checkHttpOrHttps(String url) {
        try {
            URL parsed = new URL(url);
            String protocol = parsed.getProtocol();
            if (!"http".equalsIgnoreCase(protocol) && !"https".equalsIgnoreCase(protocol)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_HTTP_HTTPS_ONLY);
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception ignore) {
            // Let upper layer handle uniformly
        }
    }

    /**
     * Prohibits user information (user:pass@host) to avoid SSRF/phishing disguise. Original
     * implementation was simple contains("@"), here more precise: check URI's userInfo.
     *
     * @param url the URL to check for user information
     * @throws BusinessException if URL contains user information
     */
    public void symbolCheck(String url) {
        try {
            URI uri = new URI(url);
            if (StringUtils.isNotBlank(uri.getUserInfo())) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
            // Compatibility fallback: raw @ in authority
            String auth = uri.getRawAuthority();
            if (auth != null && auth.contains("@")) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
        } catch (URISyntaxException e) {
            // Parsing failure handled by upper layer
        }
    }

    /**
     * Main entry point for comprehensive URL validation.
     *
     * <p>
     * Order:
     * </p>
     * <ol>
     * <li>Non-empty and decode</li>
     * <li>Protocol validation (http/https)</li>
     * <li>Prohibit userInfo/@</li>
     * <li>IPv4-mapped / IPv6 rejection</li>
     * <li>Short link rejection</li>
     * <li>Blacklist/whitelist validation (considering one redirect)</li>
     * </ol>
     *
     * <p>
     * Any step failure throws business exception. Avoids exposing raw system exceptions to frontend.
     * </p>
     *
     * @param url the URL to validate
     * @throws BusinessException if URL validation fails
     */
    public void checkUrl(String url) {
        if (StringUtils.isBlank(url)) {
            throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
        }
        try {
            // Unified decoding (%xx) - Note: only once to avoid double decoding
            String decoded = URLDecoder.decode(url, StandardCharsets.UTF_8);

            // 1) Protocol
            checkHttpOrHttps(decoded);

            // 2) User information/special symbols
            symbolCheck(decoded);

            // 3) IPv4-mapped / IPv6
            IPv4MappedCheck(decoded);
            checkUrlForIPv6(decoded);

            // 4) Short links
            resolveShortLink(decoded);

            // 5) Blacklist/whitelist
            checkBlackList(decoded);

        } catch (BusinessException e) {
            // Business semantic exception: throw as-is
            throw e;
        } catch (Exception e) {
            // Unified as URL illegal
            log.debug("checkUrl unexpected error: {}", e.toString());
            throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
        }
    }

    // ========================= Private helpers =========================

    /**
     * Reads CSV configuration from config table by category and converts to deduplicated String list.
     * Returns empty list when empty/exception.
     *
     * @param category the configuration category to read
     * @return list of configuration values, empty if none found
     */
    private List<String> readCsvConfig(String category) {
        try {
            List<ConfigInfo> items = configInfoMapper.getListByCategory(category);
            if (items == null || items.isEmpty())
                return Collections.emptyList();

            String value = items.get(0).getValue();
            if (StringUtils.isBlank(value))
                return Collections.emptyList();

            String[] parts = value.split(",");
            List<String> list = new ArrayList<>(parts.length);
            for (String p : parts) {
                String s = StringUtils.trimToEmpty(p);
                if (!s.isEmpty())
                    list.add(s);
            }
            return list;
        } catch (Exception e) {
            log.warn("readCsvConfig error, category={}, err={}", category, e.toString());
            return Collections.emptyList();
        }
    }

    private record RedirectLookupResult(int statusCode, String location) {}

    private boolean isHostInDomainAllowList(String host, List<String> domainWhiteList) {
        if (StringUtils.isBlank(host) || domainWhiteList == null || domainWhiteList.isEmpty()) {
            return false;
        }
        String normalizedHost = StringUtils.lowerCase(StringUtils.trim(host), Locale.ROOT);
        for (String allowed : domainWhiteList) {
            String normalizedAllowed = StringUtils.lowerCase(StringUtils.trimToEmpty(allowed), Locale.ROOT);
            // Remove leading dot if present (e.g., ".example.com" -> "example.com")
            if (normalizedAllowed.startsWith(".")) {
                normalizedAllowed = normalizedAllowed.substring(1);
            }
            if (normalizedAllowed.isEmpty()) {
                continue;
            }
            if (normalizedHost.equals(normalizedAllowed) || normalizedHost.endsWith("." + normalizedAllowed)) {
                return true;
            }
        }
        return false;
    }

    private URL toSafeHttpUrl(String url) throws IOException {
        try {
            URI uri = new URI(url);
            String scheme = StringUtils.lowerCase(uri.getScheme(), Locale.ROOT);
            if (!"http".equals(scheme) && !"https".equals(scheme)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_HTTP_HTTPS_ONLY);
            }
            if (StringUtils.isNotBlank(uri.getUserInfo())) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
            String host = uri.getHost();
            if (StringUtils.isBlank(host)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
            String asciiHost = IDN.toASCII(host);
            String path = StringUtils.defaultIfBlank(uri.getPath(), "/");
            return new URI(
                    scheme,
                    null,
                    asciiHost,
                    uri.getPort(),
                    path,
                    uri.getQuery(),
                    null).toURL();
        } catch (URISyntaxException e) {
            throw new IOException("Illegal URL", e);
        }
    }

    private void ensurePublicAddresses(String host, List<String> ipWhiteList) throws UnknownHostException {
        boolean ipLiteral = SsrfValidators.isIpLiteral(host);
        for (InetAddress address : InetAddress.getAllByName(host)) {
            if (!(ipLiteral && SsrfValidators.isAddressMatchedByIpRules(address, ipWhiteList))
                    && SsrfValidators.isRestrictedAddress(address)) {
                throw new BusinessException(ResponseEnum.TOOLBOX_URL_ILLEGAL);
            }
        }
    }
}
