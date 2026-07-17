package com.iflytek.astron.console.hub.service.agentmemory.provider;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

@Component
public class AgentMemoryProviderFactory {

    private final Map<String, AgentMemoryProvider> providers;

    public AgentMemoryProviderFactory(List<AgentMemoryProvider> providers) {
        this.providers = providers.stream()
                .collect(Collectors.toUnmodifiableMap(
                        provider -> StringUtils.upperCase(provider.provider()),
                        Function.identity()));
    }

    public Optional<AgentMemoryProvider> getProvider(String provider) {
        return Optional.ofNullable(providers.get(StringUtils.upperCase(StringUtils.defaultString(provider))));
    }
}
