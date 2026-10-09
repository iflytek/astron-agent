package com.iflytek.astron.console.hub.controller.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.toolkit.service.model.ModelService;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AgentRuntimeCredentialControllerTest {

    private final ModelService modelService = mock(ModelService.class);
    private final AgentRuntimeCredentialController controller =
            new AgentRuntimeCredentialController(modelService);

    @Test
    void resolvesCredentialOnlyForBoundModelOwnerAndSpace() {
        when(modelService.getPublishedRuntimeModelCredential(7L, "owner-1", 42L))
                .thenReturn("provider-secret");

        Map<String, String> response =
                controller.resolveModelCredential(7L, "owner-1", 42L);

        assertEquals(Map.of("api_key", "provider-secret"), response);
        verify(modelService).getPublishedRuntimeModelCredential(7L, "owner-1", 42L);
    }

    @Test
    void rejectsMissingCredential() {
        when(modelService.getPublishedRuntimeModelCredential(7L, "owner-1", 42L))
                .thenReturn("");

        assertThrows(
                BusinessException.class,
                () -> controller.resolveModelCredential(7L, "owner-1", 42L));
    }
}
