package com.iflytek.astron.console.toolkit.service.model;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.response.ApiResult;
import com.iflytek.astron.console.toolkit.entity.biz.modelconfig.*;
import com.iflytek.astron.console.toolkit.entity.table.ConfigInfo;
import com.iflytek.astron.console.toolkit.entity.table.model.Model;
import com.iflytek.astron.console.toolkit.entity.table.model.ModelCommon;
import com.iflytek.astron.console.toolkit.entity.vo.CategoryTreeVO;
import com.iflytek.astron.console.toolkit.entity.vo.LLMInfoVo;
import com.iflytek.astron.console.toolkit.entity.vo.ModelCategoryReq;
import com.iflytek.astron.console.toolkit.mapper.ConfigInfoMapper;
import com.iflytek.astron.console.toolkit.mapper.bot.SparkBotMapper;
import com.iflytek.astron.console.toolkit.mapper.model.ModelMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.handler.LocalModelHandler;
import com.iflytek.astron.console.toolkit.util.S3Util;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.*;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.security.interfaces.RSAPrivateKey;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ModelService}.
 *
 * <p>
 * Notes:
 * </p>
 * <ul>
 * <li>Use {@code @Spy} + {@code @InjectMocks} to execute real logic with partial stubbing.</li>
 * <li>Construct different input parameters and mocked results to cover key branches and exception
 * paths.</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class ModelServiceTest {

    @Mock
    private ModelMapper mapper;
    @Mock
    private LLMService llmService;
    @Mock
    private ConfigInfoMapper configInfoMapper;
    @Mock
    private RestTemplate restTemplate;
    @Mock
    private S3Util s3UtilClient;
    @Mock
    private WorkflowMapper workflowMapper;
    @Mock
    private SparkBotMapper sparkBotMapper;
    @Mock
    private ModelCategoryService modelCategoryService;
    @Mock
    private ModelCommonService modelCommonService;
    @Mock
    private LocalModelHandler modelHandler;

    @Spy
    @InjectMocks
    private ModelService modelService; // Target under test

    /**
     * Initialize a mock HTTP request context before each test to provide headers (e.g., space-id).
     *
     * @since 1.0
     */
    @BeforeEach
    void setup() {
        MockHttpServletRequest mockReq = new MockHttpServletRequest();
        mockReq.addHeader("space-id", 1);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(mockReq));
    }

    /**
     * Test {@link ModelService#validateModel(ModelValidationRequest)} for the bypass-decrypt branch
     * (i.e., id != null and apiKeyMasked == false).
     *
     * <p>
     * Covers:
     * </p>
     * <ul>
     * <li>URL completion to /v1/chat/completions</li>
     * <li>SSRF blacklist lookup</li>
     * <li>OpenAI-compatible response validation</li>
     * <li>saveOrUpdateModel (update path)</li>
     * </ul>
     *
     * @throws BusinessException if validation fails unexpectedly
     * @since 1.0
     */
    @Test
    void testValidateModel_bypassDecrypt_success() {
        // given
        ModelValidationRequest req = new ModelValidationRequest();
        req.setId(100L);
        req.setApiKeyMasked(false); // Bypass decryptApiKey
        req.setEndpoint("https://api.example.com"); // Will be appended with /v1/chat/completions
        req.setDomain("gpt-4o-mini");
        req.setModelName("my-model");
        req.setUid("u1");
        req.setTag(Collections.emptyList());
        req.setConfig(Collections.emptyList());

        // DB: fetch existing model (plaintext key)
        Model dbModel = new Model();
        dbModel.setId(100L);
        dbModel.setUid("u1");
        dbModel.setApiKey("PLAINTEXT_DB_KEY");
        dbModel.setIsDeleted(false);
        dbModel.setDomain("old-domain");
        dbModel.setUrl("https://old-url");
        doReturn(dbModel).when(modelService).getById(100L);

        // SSRF blacklist configuration (empty)
        when(configInfoMapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(Collections.singletonList(new ConfigInfo()));

        // saveOrUpdateModel(update):
        // 1) first getOne returns existing model
        // 2) second getOne returns null (no duplication)
        doReturn(dbModel)
                .doReturn(null)
                .when(modelService)
                .getOne(any(LambdaQueryWrapper.class));
        // updateById succeeds
        when(mapper.updateById(any(Model.class))).thenReturn(1);
        // category binding
        doNothing().when(modelCategoryService).saveAll(any(ModelCategoryReq.class));

        // HTTP success (OpenAI-compatible)
        String okResp = """
                {"choices":[{"message":{"role":"assistant","content":"hi"}}],"usage":{"prompt_tokens":1,"completion_tokens":1}}
                """;
        ResponseEntity<String> httpOk = new ResponseEntity<>(okResp, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(httpOk);

        // when
        String result = modelService.validateModel(req);

        // then
        assertEquals("Model validation passed", result);
        verify(mapper, atLeastOnce()).updateById(any(Model.class));
        verify(modelCategoryService, times(1)).saveAll(any(ModelCategoryReq.class));
    }

    /**
     * Test {@link ModelService#validateModel(ModelValidationRequest)} with a response that is not
     * OpenAI-compatible (missing "usage" field), expecting a business exception.
     *
     * @throws BusinessException expected
     * @since 1.0
     */
    @Test
    void testValidateModel_responseNotCompatible_throws() {
        // given
        ModelValidationRequest req = new ModelValidationRequest();
        req.setId(101L);
        req.setApiKeyMasked(false);
        req.setEndpoint("https://api.example.com/base");
        req.setDomain("gpt-4o");
        req.setModelName("m2");
        req.setUid("u1");

        Model dbModel = new Model();
        dbModel.setId(101L);
        dbModel.setUid("u1");
        dbModel.setApiKey("DB_KEY");
        dbModel.setIsDeleted(false);
        doReturn(dbModel).when(modelService).getById(101L);
        when(configInfoMapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(Collections.emptyList());

        // HTTP response missing "usage"
        String badResp = """
                {"choices":[{"message":{"role":"assistant","content":"hi"}}]}
                """;
        ResponseEntity<String> httpOk = new ResponseEntity<>(badResp, HttpStatus.OK);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(httpOk);

        // then
        BusinessException ex = assertThrows(BusinessException.class, () -> modelService.validateModel(req));
        assertNotNull(ex.getMessage());
    }

    /**
     * Test {@link ModelService#validateModel(ModelValidationRequest)} when HTTP request throws 401/5xx,
     * which should be mapped to MODEL_APIKEY_ERROR.
     *
     * @throws BusinessException expected
     * @since 1.0
     */
    @Test
    void testValidateModel_httpError_apikeyError() {
        ModelValidationRequest req = new ModelValidationRequest();
        req.setId(102L);
        req.setApiKeyMasked(false);
        req.setEndpoint("https://api.example.com"); // Will be appended with /v1/chat/completions
        req.setDomain("gpt-4o");
        req.setModelName("m3");
        req.setUid("u1");

        // Spy note: ServiceImpl methods should be stubbed via doReturn to avoid baseMapper access
        Model dbModel = new Model();
        dbModel.setId(102L);
        dbModel.setUid("u1");
        dbModel.setApiKey("DB_KEY");
        dbModel.setIsDeleted(false);
        doReturn(dbModel).when(modelService).getById(102L);

        // Minimal necessary stubs
        when(configInfoMapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(Collections.emptyList());

        when(restTemplate.exchange(
                anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.UNAUTHORIZED, "401"));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> modelService.validateModel(req));
        assertNotNull(ex.getMessage());
    }

    /**
     * Test decrypt branch of {@link ModelService#validateModel(ModelValidationRequest)} when private
     * key configuration is missing, expecting a business exception.
     *
     * @throws BusinessException expected
     * @since 1.0
     */
    @Test
    void testValidateModel_decrypt_missingPrivateKey_throws() {
        // given: trigger decryptApiKey (id == null)
        ModelValidationRequest req = new ModelValidationRequest();
        req.setId(null);
        req.setApiKeyMasked(null);
        req.setApiKey("ENCRYPTEDxxx");
        req.setEndpoint("https://api.example.com");
        req.setDomain("gpt-4o");
        req.setModelName("m4");
        req.setUid("u1");

        // Private key not configured
        when(configInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        BusinessException ex = assertThrows(BusinessException.class, () -> modelService.validateModel(req));
        assertNotNull(ex.getMessage());
    }

    /**
     * Test {@link ModelService#getPublicKey()} for both existing and missing configuration values.
     *
     * @since 1.0
     */
    @Test
    void testGetPublicKey() {
        ConfigInfo ok = new ConfigInfo();
        ok.setValue("PUBLIC_KEY_CONTENT");
        when(configInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(ok);

        String k1 = modelService.getPublicKey();
        assertEquals("PUBLIC_KEY_CONTENT", k1);

        when(configInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);
        String k2 = modelService.getPublicKey();
        assertNull(k2);
    }

    /**
     * Test {@link ModelService#getAllCategoryTree()} to ensure only whitelisted keys are retained.
     *
     * @since 1.0
     */
    @Test
    void testGetAllCategoryTree_filters() {
        List<CategoryTreeVO> all = new ArrayList<>();
        all.add(vo("modelCategory"));
        all.add(vo("languageSupport"));
        all.add(vo("contextLengthTag"));
        all.add(vo("modelScenario"));
        all.add(vo("otherKey")); // Should be filtered out
        when(modelCategoryService.getAllCategoryTree()).thenReturn(all);

        List<CategoryTreeVO> filtered = modelService.getAllCategoryTree();
        assertEquals(4, filtered.size());
        assertTrue(filtered.stream().allMatch(v -> Set.of("modelCategory", "languageSupport", "contextLengthTag", "modelScenario").contains(v.getKey())));
    }

    /**
     * Test {@link ModelService#(Integer, Long, String)} for the public model path (avoids static
     * dependencies on user context).
     *
     * @throws Exception if invocation fails
     * @since 1.0
     */
    @Test
    void testGetDetail_publicModel_ok() throws Exception {
        ModelCommon mc = new ModelCommon();
        mc.setId(9L);
        mc.setDomain("gpt-4o");
        mc.setDesc("d");
        mc.setUserAvatar("icon");
        mc.setCreateTime(new Date());
        mc.setUpdateTime(new Date());
        mc.setUserName("u");
        mc.setUrl("https://x");
        CategoryTreeVO providerNode = new CategoryTreeVO();
        providerNode.setKey("modelProvider");
        providerNode.setName("openai");
        mc.setCategoryTree(Collections.singletonList(providerNode));
        when(modelCommonService.getById(9L)).thenReturn(mc);

        ApiResult ret = modelService.getDetail(1, 9L, null);
        assertNotNull(ret);
        LLMInfoVo vo = (LLMInfoVo) ret.data();
        assertEquals("gpt-4o", vo.getDomain());
        assertEquals(9L, vo.getModelId());
    }

    @Test
    void testGetList_publicModel_resolvesDeepSeekProvider() {
        ModelCommon deepSeek = new ModelCommon();
        deepSeek.setId(21L);
        deepSeek.setName("DeepSeek-V3");
        deepSeek.setDomain("deepseek-chat");
        deepSeek.setServiceId("deepseek-chat");
        deepSeek.setUrl("https://api.deepseek.com/v1/chat/completions");
        deepSeek.setUserAvatar("icon");
        deepSeek.setCreateTime(new Date());
        deepSeek.setUpdateTime(new Date());
        CategoryTreeVO providerNode = new CategoryTreeVO();
        providerNode.setKey("modelProvider");
        providerNode.setName("深度求索");
        deepSeek.setCategoryTree(Collections.singletonList(providerNode));

        when(modelCommonService.getCommonModelList("u1", null))
                .thenReturn(Collections.singletonList(deepSeek));

        List<LLMInfoVo> publicModels = new ArrayList<>();
        llmService.getDataFromModelShelfList(publicModels, Collections.emptyList(), "u1", null);

        assertEquals(1, publicModels.size());
        assertEquals("deepseek", publicModels.get(0).getProvider());
    }

    @Test
    void testGetDetail_customModel_defaultsProviderToOpenAi() {
        Model model = new Model();
        model.setId(12L);
        model.setUid("u1");
        model.setName("legacy-custom");
        model.setType(1);
        model.setApiKey("sk-12345678");
        model.setDomain("legacy-domain");
        model.setConfig("[]");
        model.setDesc("desc");
        model.setImageUrl("icon");
        model.setCreateTime(new Date());
        model.setUpdateTime(new Date());
        when(mapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(model);
        when(modelCategoryService.getTree(12L)).thenReturn(Collections.emptyList());
        when(s3UtilClient.getS3Prefix()).thenReturn("s3://x");

        try (MockedStatic<com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler> user =
                mockStatic(com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler.class)) {
            com.iflytek.astron.console.commons.entity.user.UserInfo userInfo =
                    new com.iflytek.astron.console.commons.entity.user.UserInfo();
            userInfo.setUsername("tester");
            user.when(com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler::get)
                    .thenReturn(userInfo);

            ApiResult ret = modelService.getDetail(0, 12L, null);
            LLMInfoVo vo = (LLMInfoVo) ret.data();
            assertEquals("openai", vo.getProvider());
        }
    }

    /**
     * Test {@link ModelService#localModelList()} to verify delegation to the handler.
     *
     * @since 1.0
     */
    @Test
    void testLocalModelList() {
        List<?> list = Collections.singletonList(new Object());
        when(modelHandler.getLocalModelList()).thenReturn((List) list);
        Object ret = modelService.localModelList();
        assertTrue(ret instanceof List<?>);
        assertEquals(1, ((List<?>) ret).size());
    }

    /**
     * Test {@link ModelService#flushStatus(Model)} for the "RUNNING" status update, verifying endpoint
     * URL propagation and that an update operation is invoked.
     *
     * @since 1.0
     */
    @Test
    void testFlushStatus_runningUpdate() {
        Model m = new Model();
        m.setId(1L);
        m.setType(2);
        m.setRemark("svc-1");
        m.setStatus(0);
        m.setEnable(false);

        JSONObject resp = new JSONObject();
        // Be tolerant with case/field names
        resp.put("status", "RUNNING");
        resp.put("phase", "Running");
        resp.put("serviceStatus", "Running");
        resp.put("endpoint", "https://svc-endpoint");
        resp.put("serviceEndpoint", "https://svc-endpoint");
        when(modelHandler.checkDeployStatus("svc-1")).thenReturn(resp);

        // Intercept the update to assert minimal expectations
        doAnswer(inv -> {
            Model updated = inv.getArgument(0);
            assertEquals(1L, updated.getId());
            assertEquals("https://svc-endpoint", updated.getUrl());
            return true; // Mark update success
        }).when(modelService).updateById(any(Model.class));

        modelService.flushStatus(m);
        verify(modelService, times(1)).updateById(any(Model.class));
    }

    /**
     * Test {@link ModelService#flushStatusBatch(String, List)} for batch processing: only records with
     * {@code type=2} and non-empty remark are considered and updated.
     *
     * @since 1.0
     */
    @Test
    void testFlushStatusBatch_batchUpdate() {
        Model a = new Model();
        a.setId(1L);
        a.setType(2);
        a.setRemark("svc-a");
        a.setStatus(0);
        Model b = new Model();
        b.setId(2L);
        b.setType(2);
        b.setRemark("svc-b");
        b.setStatus(0);
        Model c = new Model();
        c.setId(3L);
        c.setType(1); // Should be skipped

        JSONObject ra = new JSONObject().fluentPut("status", "RUNNING").fluentPut("endpoint", "https://a");
        JSONObject rb = new JSONObject().fluentPut("status", "FAILED").fluentPut("endpoint", "https://b");
        when(modelHandler.checkDeployStatus("svc-a")).thenReturn(ra);
        when(modelHandler.checkDeployStatus("svc-b")).thenReturn(rb);

        // Intercept batch update and mark success
        doReturn(true).when(modelService).updateBatchById(anyList());

        int updated = modelService.flushStatusBatch("u1", Arrays.asList(a, b, c));
        assertTrue(updated >= 1);
        verify(modelService, times(1)).updateBatchById(anyList());
    }

    /**
     * Helper to construct a {@link CategoryTreeVO} with the given key.
     *
     * @param k category key
     * @return a {@link CategoryTreeVO} instance with key set
     * @since 1.0
     */
    private static CategoryTreeVO vo(String k) {
        CategoryTreeVO v = new CategoryTreeVO();
        v.setKey(k);
        return v;
    }

    /**
     * Test creation flow of {@link ModelService#validateModel(ModelValidationRequest)} when private key
     * decryption succeeds (id == null).
     *
     * @throws BusinessException if validation or persistence fails unexpectedly
     * @since 1.0
     */
    @Test
    void testValidateModel_createNew_decrypt_success() {
        // given: trigger decrypt branch (id == null)
        ModelValidationRequest req = new ModelValidationRequest();
        req.setId(null);
        req.setApiKeyMasked(null);
        req.setApiKey("ENCRYPTED_BASE64");
        req.setEndpoint("https://api.example.com"); // Will be appended with /v1/chat/completions
        req.setDomain("gpt-4o-mini");
        req.setModelName("my-new");
        req.setUid("u1");
        req.setTag(Collections.emptyList());
        req.setConfig(Collections.emptyList());

        // SSRF blacklist
        when(configInfoMapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(Collections.emptyList());

        // 1) private key exists
        ConfigInfo pri = new ConfigInfo();
        pri.setCategory("MODEL_SECRET_KEY");
        pri.setCode("private_key");
        pri.setIsValid(1);
        pri.setValue("-----BEGIN PRIVATE KEY-----\\nxxx\\n-----END PRIVATE KEY-----");
        when(configInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(pri);

        // 2) mock static RSAUtil: loadPrivateKey + decrypt
        try (MockedStatic<com.iflytek.astron.console.toolkit.util.idata.RSAUtil> rsa = mockStatic(com.iflytek.astron.console.toolkit.util.idata.RSAUtil.class)) {
            RSAPrivateKey mockKey = mock(RSAPrivateKey.class);
            rsa.when(() -> com.iflytek.astron.console.toolkit.util.idata.RSAUtil.loadPrivateKey(anyString()))
                    .thenReturn(mockKey);
            rsa.when(() -> com.iflytek.astron.console.toolkit.util.idata.RSAUtil.decryptByPrivateKeyBase64(eq("ENCRYPTED_BASE64"), eq(mockKey)))
                    .thenReturn("DECRYPTED_KEY");

            // 3) saveOrUpdateModel: creation branch
            // - duplicate check returns null
            doReturn(null).when(modelService).getOne(any(LambdaQueryWrapper.class));
            // - insert success
            when(mapper.insert(any(Model.class))).thenAnswer(inv -> 1);
            doNothing().when(modelCategoryService).saveAll(any(ModelCategoryReq.class));

            // 4) HTTP returns OpenAI-compatible response
            String okResp = """
                    {"choices":[{"message":{"role":"assistant","content":"hi"}}],"usage":{"prompt_tokens":1,"completion_tokens":1}}
                    """;
            when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>(okResp, HttpStatus.OK));

            // 5) mock SpaceInfoUtil.getSpaceId() to set space id on creation
            try (MockedStatic<com.iflytek.astron.console.commons.util.space.SpaceInfoUtil> space = mockStatic(com.iflytek.astron.console.commons.util.space.SpaceInfoUtil.class)) {
                space.when(com.iflytek.astron.console.commons.util.space.SpaceInfoUtil::getSpaceId).thenReturn(1001L);

                // when
                String result = modelService.validateModel(req);

                // then
                assertEquals("Model validation passed", result);
                verify(mapper, times(1)).insert(any(Model.class));
                verify(modelCategoryService, times(1)).saveAll(any(ModelCategoryReq.class));
            }
        }
    }

    @Test
    void testValidateModel_anthropic_success() {
        ModelValidationRequest req = new ModelValidationRequest();
        req.setId(103L);
        req.setApiKeyMasked(false);
        req.setEndpoint("https://api.anthropic.com");
        req.setDomain("claude-3-7-sonnet-20250219");
        req.setModelName("claude");
        req.setUid("u1");
        req.setProvider("anthropic");
        req.setTag(Collections.emptyList());
        req.setConfig(Collections.emptyList());

        Model dbModel = new Model();
        dbModel.setId(103L);
        dbModel.setUid("u1");
        dbModel.setApiKey("ANTHROPIC_KEY");
        dbModel.setIsDeleted(false);
        dbModel.setDomain("old-domain");
        dbModel.setUrl("https://old-url");
        doReturn(dbModel).when(modelService).getById(103L);
        doReturn(dbModel).doReturn(null).when(modelService).getOne(any(LambdaQueryWrapper.class));
        when(configInfoMapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(Collections.emptyList());
        when(mapper.updateById(any(Model.class))).thenReturn(1);
        doNothing().when(modelCategoryService).saveAll(any(ModelCategoryReq.class));

        String okResp = """
                {"id":"msg_1","content":[{"type":"text","text":"hi"}],"usage":{"input_tokens":1,"output_tokens":1}}
                """;
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(new ResponseEntity<>(okResp, HttpStatus.OK));

        String result = modelService.validateModel(req);

        assertEquals("Model validation passed", result);
        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<Map<String, Object>>> entityCaptor =
                ArgumentCaptor.forClass((Class) HttpEntity.class);
        verify(restTemplate).exchange(
                urlCaptor.capture(),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(String.class));
        assertEquals("https://api.anthropic.com/v1/messages", urlCaptor.getValue());
        assertEquals("ANTHROPIC_KEY", entityCaptor.getValue().getHeaders().getFirst("x-api-key"));
        assertEquals("2023-06-01", entityCaptor.getValue().getHeaders().getFirst("anthropic-version"));
        assertNull(entityCaptor.getValue().getHeaders().getFirst("Authorization"));

        ArgumentCaptor<Model> modelCaptor = ArgumentCaptor.forClass(Model.class);
        verify(mapper).updateById(modelCaptor.capture());
        assertEquals("anthropic", modelCaptor.getValue().getProvider());
    }

    /**
     * Test {@link ModelService#validateModel(ModelValidationRequest)} when endpoint URL contains a
     * query string, which should be rejected.
     *
     * @throws BusinessException expected
     * @since 1.0
     */
    @Test
    void testValidateModel_urlWithQuery_shouldFail() {
        ModelValidationRequest req = new ModelValidationRequest();
        req.setId(1L);
        req.setApiKeyMasked(false); // Bypass decrypt
        req.setEndpoint("https://api.example.com/chat?x=1"); // Contains query, should be blocked
        req.setDomain("gpt-4o");
        req.setModelName("m-url");
        req.setUid("u1");

        Model m = new Model();
        m.setId(1L);
        m.setUid("u1");
        m.setApiKey("K");
        m.setIsDeleted(false);
        doReturn(m).when(modelService).getById(1L);

        when(configInfoMapper.getListByCategory("NETWORK_SEGMENT_BLACK_LIST"))
                .thenReturn(Collections.emptyList());

        BusinessException ex = assertThrows(BusinessException.class, () -> modelService.validateModel(req));
        assertNotNull(ex.getMessage());
    }

    /**
     * Test {@link ModelService#(ModelDto, String)} to ensure public and owner models are merged, sorted
     * and paginated correctly.
     *
     * @since 1.0
     */
    @Test
    void testGetList_mergeAndPage_ok() {
        // Populate public list via llmService
        doAnswer(inv -> {
            List<LLMInfoVo> out = inv.getArgument(0);
            LLMInfoVo a = new LLMInfoVo();
            a.setId(10L);
            a.setCreateTime(new Date(1000));
            a.setName("a");
            LLMInfoVo b = new LLMInfoVo();
            b.setId(11L);
            b.setCreateTime(new Date(2000));
            b.setName("b");
            out.add(a);
            out.add(b);
            return null;
        }).when(llmService).getDataFromModelShelfList(anyList(), anyList(), anyString(), any());

        // Owner list: mapper.selectList returns two items
        Model m1 = new Model();
        m1.setId(1L);
        m1.setUid("u1");
        m1.setName("self1");
        m1.setDomain("d1");
        m1.setCreateTime(new Date(1500));
        m1.setIsDeleted(false);
        Model m2 = new Model();
        m2.setId(2L);
        m2.setUid("u1");
        m2.setName("self2");
        m2.setDomain("d2");
        m2.setType(1);
        m2.setCreateTime(new Date(2500));
        m2.setIsDeleted(false);
        when(mapper.selectList(any(LambdaQueryWrapper.class))).thenReturn(Arrays.asList(m1, m2));
        when(s3UtilClient.getS3Prefix()).thenReturn("s3://x");
        when(modelCategoryService.getTree(anyLong())).thenReturn(Collections.emptyList());

        ModelDto dto = new ModelDto();
        dto.setUid("u1");
        dto.setPage(1);
        dto.setPageSize(3);
        dto.setType(0); // include both public and owner

        ApiResult<Page<LLMInfoVo>> ret = modelService.getList(dto, null);
        Page<LLMInfoVo> page = ret.data();

        assertEquals(3, page.getRecords().size()); // total 4, page size 3
        // Sorted by createTime desc
        assertEquals(Long.valueOf(2L), page.getRecords().get(0).getId());
        assertEquals("openai", page.getRecords().get(0).getProvider());
    }

    /**
     * Test {@link ModelService#localModel(LocalModelDto)} creation flow, including context length
     * resolution from category (e.g., "128k").
     *
     * @since 1.0
     */
    @Test
    void testLocalModel_create_ok_withContextLength() {
        LocalModelDto dto = new LocalModelDto();
        dto.setUid("u1");
        dto.setModelName("n1");
        dto.setDomain("d1");
        dto.setReplicaCount(1);
        dto.setAcceleratorCount(0);

        // contextLength from category "128k"
        ModelCategoryReq mcReq = new ModelCategoryReq();
        mcReq.setContextLengthSystemId(999L);
        dto.setModelCategoryReq(mcReq);

        com.iflytek.astron.console.toolkit.entity.table.model.ModelCategory cat = new com.iflytek.astron.console.toolkit.entity.table.model.ModelCategory();
        cat.setId(999L);
        cat.setName("128k");
        when(modelCategoryService.getById(999L)).thenReturn(cat);

        // not duplicated
        doReturn(null).when(modelService).getOne(any(LambdaQueryWrapper.class));

        // deploy returns service id
        when(modelHandler.deployModel(any())).thenReturn("svc-new");

        // persistence: save() true; category binding
        doReturn(true).when(modelService).save(any(Model.class));
        doNothing().when(modelCategoryService).saveAll(any(ModelCategoryReq.class));

        // space id
        try (MockedStatic<com.iflytek.astron.console.commons.util.space.SpaceInfoUtil> space = mockStatic(com.iflytek.astron.console.commons.util.space.SpaceInfoUtil.class)) {
            space.when(com.iflytek.astron.console.commons.util.space.SpaceInfoUtil::getSpaceId).thenReturn(2002L);

            Object ok = modelService.localModel(dto);
            assertEquals(Boolean.TRUE, ok);
            verify(modelHandler, times(1)).deployModel(any());
            verify(modelCategoryService, times(1)).saveAll(any(ModelCategoryReq.class));
        }
    }

    /**
     * Test {@link ModelService#localModel(LocalModelDto)} edit flow (existing model found, authorized,
     * and updated).
     *
     * @since 1.0
     */
    @Test
    void testLocalModel_edit_ok() {
        LocalModelDto dto = new LocalModelDto();
        dto.setId(7L);
        dto.setUid("u1");
        dto.setModelName("edit");
        dto.setDomain("d2");

        Model exists = new Model();
        exists.setId(7L);
        exists.setUid("u1");
        exists.setIsDeleted(false);
        doReturn(exists).when(modelService).getById(7L);

        when(modelHandler.deployModelUpdate(any(), nullable(String.class)))
                .thenReturn("svc-old");
        doReturn(true).when(modelService).updateById(any(Model.class));
        doNothing().when(modelCategoryService).saveAll(any(ModelCategoryReq.class));
        doReturn(null).when(modelService).getOne(any(LambdaQueryWrapper.class));

        Object ok = modelService.localModel(dto);
        assertEquals(Boolean.TRUE, ok);
        verify(modelHandler, times(1)).deployModelUpdate(any(), nullable(String.class));
    }

    /**
     * Test {@link ModelService#(Long, Integer, String, String)} for both authorized enable-on success
     * and unauthorized rejection.
     *
     * @since 1.0
     */
    @Test
    void testSwitchModel_enable_on_success_and_unauthorized() {
        // Authorized path
        try (MockedStatic<com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler> u = mockStatic(com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler.class)) {
            u.when(com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler::getUserId).thenReturn("u1");

            Model m = new Model();
            m.setId(5L);
            m.setUid("u1");
            doReturn(m).when(modelService).getById(5L);
            doReturn(true).when(modelService).updateById(any(Model.class));

            ApiResult ret = modelService.switchModel(5L, 3, "on", null);
            assertTrue((Boolean) ret.data());
            verify(modelService, times(1)).updateById(any(Model.class));
        }

        // Unauthorized path
        try (MockedStatic<com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler> u = mockStatic(com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler.class)) {
            u.when(com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler::getUserId).thenReturn("u2");

            Model m = new Model();
            m.setId(6L);
            m.setUid("owner");
            doReturn(m).when(modelService).getById(6L);

            BusinessException ex = assertThrows(BusinessException.class, () -> modelService.switchModel(6L, 3, "on", null));
            assertNotNull(ex.getMessage());
        }
    }

    /**
     * Test error path of internal scene filter loader via {@link ModelService#(ModelDto, String)}.
     *
     * @since 1.0
     */
    @Test
    void testLoadSceneFilterSafe_errorPath() {
        when(configInfoMapper.selectOne(any(LambdaQueryWrapper.class))).thenThrow(new RuntimeException("boom"));
        // Trigger loadSceneFilterSafe indirectly through getList
        ModelDto dto = new ModelDto(); dto.setUid("u1"); dto.setType(0);
        ApiResult<Page<LLMInfoVo>> ret = modelService.getList(dto, null);
        assertNotNull(ret);
    }

    /**
     * Test helpers {@link ModelService#encodeId(long)}, {@link ModelService#decodeId(long)} and
     * {@link ModelService#generate9DigitRandomFromId(long)}.
     *
     * @since 1.0
     */
    @Test
    void testEncodeDecodeAndGenerate() {
        long id = 12345L;
        long enc = ModelService.encodeId(id);
        long dec = ModelService.decodeId(enc);
        assertEquals(id, dec);

        long nine = ModelService.generate9DigitRandomFromId(7L);
        assertTrue(nine >= 100_000_000L && nine <= 999_999_999L);
    }
}
