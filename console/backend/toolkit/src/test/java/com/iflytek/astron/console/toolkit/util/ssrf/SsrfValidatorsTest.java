package com.iflytek.astron.console.toolkit.util.ssrf;

import okhttp3.Dns;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SsrfValidatorsTest {

    @Test
    void isIpLiteralDoesNotResolveHostname() {
        assertFalse(SsrfValidators.isIpLiteral("localhost"));
    }

    @Test
    void whitelistOverridesBlacklistForMatchingAddress() {
        assertFalse(SsrfValidators.isHostBlockedByIpBlacklist(
                "192.168.60.12",
                List.of("192.168.0.0/16"),
                List.of("192.168.60.12"),
                Dns.SYSTEM));
        assertFalse(SsrfValidators.isHostBlockedByIpBlacklist(
                "192.168.60.12",
                List.of("192.168.0.0/16"),
                List.of("192.168.60.0/24"),
                Dns.SYSTEM));
    }

    @Test
    void privateAddressIsDeniedWithoutBlacklistUnlessLiteralIpIsWhitelisted() {
        assertTrue(SsrfValidators.isHostDeniedByIpPolicy(
                "192.168.60.12", List.of(), List.of(), Dns.SYSTEM));
        assertFalse(SsrfValidators.isHostDeniedByIpPolicy(
                "192.168.60.12", List.of(), List.of("192.168.60.12"), Dns.SYSTEM));
    }

    @Test
    void specialUseAddressesAreDeniedByDefault() throws Exception {
        assertTrue(SsrfValidators.isRestrictedAddress(InetAddress.getByName("fd00::1")));
        assertTrue(SsrfValidators.isRestrictedAddress(InetAddress.getByName("100.64.0.1")));
        assertTrue(SsrfValidators.isRestrictedAddress(InetAddress.getByName("0.1.2.3")));
        assertTrue(SsrfValidators.isHostDeniedByIpPolicy(
                "fd00::1", List.of(), List.of(), Dns.SYSTEM));
        assertFalse(SsrfValidators.isHostDeniedByIpPolicy(
                "fd00::1", List.of(), List.of("fc00::/7"), Dns.SYSTEM));
    }

    @Test
    void hostnameCannotUseIpWhitelistToBypassPrivatePolicy() {
        Dns dns = hostname -> List.of(InetAddress.getByName("192.168.60.12"));

        assertTrue(SsrfValidators.isHostDeniedByIpPolicy(
                "model.internal", List.of(), List.of("192.168.60.12"), dns));
    }

    @Test
    void whitelistDoesNotHideAnotherBlacklistedDnsAddress() {
        Dns dns = hostname -> List.of(
                InetAddress.getByName("192.168.60.12"),
                InetAddress.getByName("192.168.60.13"));

        assertTrue(SsrfValidators.isHostDeniedByIpPolicy(
                "model.internal",
                List.of("192.168.0.0/16"),
                List.of("192.168.60.12"),
                dns));
    }

    @Test
    void invalidWhitelistEntryDoesNotAllowAddress() throws Exception {
        assertFalse(SsrfValidators.isAddressMatchedByIpRules(
                InetAddress.getByName("192.168.60.12"),
                List.of("model.internal", "192.168.60.0/not-a-prefix")));
    }
}
