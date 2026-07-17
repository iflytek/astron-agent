package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONException;
import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.iflytek.astron.console.commons.constant.ResponseEnum;
import com.iflytek.astron.console.commons.entity.workflow.Workflow;
import com.iflytek.astron.console.commons.exception.BusinessException;
import com.iflytek.astron.console.commons.util.space.SpaceInfoUtil;
import com.iflytek.astron.console.toolkit.common.constant.WorkflowConst;
import com.iflytek.astron.console.toolkit.config.properties.ApiUrl;
import com.iflytek.astron.console.toolkit.entity.biz.external.app.AkSk;
import com.iflytek.astron.console.toolkit.entity.common.PageData;
import com.iflytek.astron.console.toolkit.entity.core.workflow.sse.ChatSysReq;
import com.iflytek.astron.console.toolkit.entity.dto.automation.WorkflowAutomationTaskReq;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowAutomationRun;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowAutomationTask;
import com.iflytek.astron.console.toolkit.entity.table.workflow.WorkflowVersion;
import com.iflytek.astron.console.toolkit.handler.UserInfoManagerHandler;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowAutomationRunMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowAutomationTaskMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowMapper;
import com.iflytek.astron.console.toolkit.mapper.workflow.WorkflowVersionMapper;
import com.iflytek.astron.console.toolkit.service.extra.AppService;
import com.iflytek.astron.console.toolkit.tool.DataPermissionCheckTool;
import com.iflytek.astron.console.toolkit.util.JacksonUtil;
import com.iflytek.astron.console.toolkit.util.OkHttpUtil;
import com.iflytek.astron.console.toolkit.util.RedisUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowAutomationService
        extends ServiceImpl<WorkflowAutomationTaskMapper, WorkflowAutomationTask> {

    private static final String DEFAULT_TIMEZONE = "Asia/Shanghai";
    private static final String STATUS_RUNNING = "RUNNING";
    private static final String STATUS_SUCCESS = "SUCCESS";
    private static final String STATUS_FAILED = "FAILED";
    private static final String STATUS_SKIPPED = "SKIPPED";
    private static final String TRIGGER_SCHEDULE = "SCHEDULE";
    private static final String TRIGGER_MANUAL = "MANUAL";
    private static final long TASK_LOCK_TTL_SEC = 3600;
    private static final int MAX_RESPONSE_SUMMARY_LENGTH = 4000;
    private static final int CORE_WORKFLOW_NOT_PUBLISHED_CODE = 20204;

    private final WorkflowAutomationRunMapper runMapper;
    private final WorkflowMapper workflowMapper;
    private final WorkflowVersionMapper workflowVersionMapper;
    private final DataPermissionCheckTool dataPermissionCheckTool;
    private final RedisUtil redisUtil;
    private final ApiUrl apiUrl;
    private final AppService appService;

    public PageData<WorkflowAutomationTask> pageTasks(Integer current, Integer pageSize, String search,
            Boolean enabled) {
        Page<WorkflowAutomationTask> page = new Page<>(current, pageSize);
        LambdaQueryWrapper<WorkflowAutomationTask> wrapper = scopedTaskQuery();
        wrapper.eq(WorkflowAutomationTask::getDeleted, false);
        if (enabled != null) {
            wrapper.eq(WorkflowAutomationTask::getEnabled, enabled);
        }
        if (StringUtils.isNotBlank(search)) {
            wrapper.and(q -> q.like(WorkflowAutomationTask::getTaskName, search)
                    .or()
                    .like(WorkflowAutomationTask::getWorkflowName, search)
                    .or()
                    .like(WorkflowAutomationTask::getFlowId, search));
        }
        wrapper.orderByDesc(WorkflowAutomationTask::getUpdateTime);
        Page<WorkflowAutomationTask> result = page(page, wrapper);
        return toPageData(result);
    }

    @Transactional(rollbackFor = Exception.class)
    public WorkflowAutomationTask createTask(WorkflowAutomationTaskReq req) {
        Workflow workflow = validatePublishedWorkflow(req.getFlowId());
        Date now = new Date();
        WorkflowAutomationTask task = new WorkflowAutomationTask();
        applyRequest(task, req, workflow);
        task.setUid(UserInfoManagerHandler.getUserId());
        task.setSpaceId(SpaceInfoUtil.getSpaceId());
        task.setDeleted(false);
        task.setCreateTime(now);
        task.setUpdateTime(now);
        save(task);
        return task;
    }

    @Transactional(rollbackFor = Exception.class)
    public WorkflowAutomationTask updateTask(Long id, WorkflowAutomationTaskReq req) {
        WorkflowAutomationTask task = requireTask(id);
        Workflow workflow = validatePublishedWorkflow(req.getFlowId());
        applyRequest(task, req, workflow);
        task.setUpdateTime(new Date());
        updateById(task);
        return getById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public WorkflowAutomationTask enableTask(Long id, Boolean enabled) {
        WorkflowAutomationTask task = requireTask(id);
        task.setEnabled(enabled);
        task.setUpdateTime(new Date());
        if (Boolean.TRUE.equals(enabled)) {
            task.setNextFireTime(nextFireTime(task.getCronExpression(), task.getTimezone(), new Date()));
        }
        updateById(task);
        return getById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public Boolean deleteTask(Long id) {
        WorkflowAutomationTask task = requireTask(id);
        task.setDeleted(true);
        task.setEnabled(false);
        task.setUpdateTime(new Date());
        updateById(task);
        return true;
    }

    public PageData<WorkflowAutomationRun> pageRuns(Long taskId, Integer current, Integer pageSize) {
        requireTask(taskId);
        Page<WorkflowAutomationRun> page = new Page<>(current, pageSize);
        LambdaQueryWrapper<WorkflowAutomationRun> wrapper = Wrappers.lambdaQuery(WorkflowAutomationRun.class)
                .eq(WorkflowAutomationRun::getTaskId, taskId)
                .orderByDesc(WorkflowAutomationRun::getCreateTime);
        Page<WorkflowAutomationRun> result = runMapper.selectPage(page, wrapper);
        return toPageData(result);
    }

    public List<String> preview(String cronExpression, String timezone) {
        ZoneId zoneId = parseZone(timezone);
        CronExpression cron = parseCron(cronExpression);
        ZonedDateTime cursor = ZonedDateTime.now(zoneId);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z");
        java.util.ArrayList<String> result = new java.util.ArrayList<>();
        for (int i = 0; i < 5; i++) {
            ZonedDateTime next = cron.next(cursor);
            if (next == null) {
                throw new BusinessException(ResponseEnum.PARAMS_ERROR, "cron has no future fire time");
            }
            result.add(next.format(formatter));
            cursor = next;
        }
        return result;
    }

    public WorkflowAutomationRun runNow(Long id) {
        WorkflowAutomationTask task = requireTask(id);
        return runTask(task, TRIGGER_MANUAL, new Date());
    }

    public void scanAndRunDueTasks() {
        Date now = new Date();
        List<WorkflowAutomationTask> tasks = list(Wrappers.lambdaQuery(WorkflowAutomationTask.class)
                .eq(WorkflowAutomationTask::getDeleted, false)
                .eq(WorkflowAutomationTask::getEnabled, true)
                .le(WorkflowAutomationTask::getNextFireTime, now)
                .orderByAsc(WorkflowAutomationTask::getNextFireTime)
                .last("limit 50"));
        for (WorkflowAutomationTask task : tasks) {
            try {
                runTask(task, TRIGGER_SCHEDULE, task.getNextFireTime());
            } catch (Exception e) {
                log.warn("[workflow automation] task scan run failed, taskId={}, flowId={}, err={}",
                        task.getId(), task.getFlowId(), e.getMessage(), e);
            }
        }
    }

    public WorkflowAutomationRun runTask(WorkflowAutomationTask task, String triggerType, Date scheduledFireTime) {
        String token = UUID.randomUUID().toString();
        String lockKey = "workflow:automation:task:" + task.getId() + ":lock";
        if (!redisUtil.tryLock(lockKey, TASK_LOCK_TTL_SEC, token)) {
            return recordSkipped(task, triggerType, scheduledFireTime, "Previous execution is still running");
        }

        WorkflowAutomationRun run = createRun(task, triggerType, scheduledFireTime);
        long startMs = System.currentTimeMillis();
        try {
            String response = executeWorkflow(task, run.getId());
            completeRun(run, task, triggerType, STATUS_SUCCESS, response, null, System.currentTimeMillis() - startMs);
        } catch (Exception e) {
            log.warn("[workflow automation] execute failed, taskId={}, runId={}, err={}",
                    task.getId(), run.getId(), e.getMessage(), e);
            completeRun(run, task, triggerType, STATUS_FAILED, null, e.getMessage(), System.currentTimeMillis() - startMs);
        } finally {
            redisUtil.unlock(lockKey, token);
        }
        return runMapper.selectById(run.getId());
    }

    private void applyRequest(WorkflowAutomationTask task, WorkflowAutomationTaskReq req, Workflow workflow) {
        String timezone = StringUtils.defaultIfBlank(req.getTimezone(), DEFAULT_TIMEZONE);
        String inputParams = normalizeInputParams(req.getInputParams());
        task.setTaskName(StringUtils.trim(req.getTaskName()));
        task.setFlowId(req.getFlowId());
        task.setWorkflowName(workflow.getName());
        task.setVersion(StringUtils.trimToNull(req.getVersion()));
        task.setCronExpression(StringUtils.trim(req.getCronExpression()));
        task.setScheduleType(StringUtils.defaultIfBlank(req.getScheduleType(), "CUSTOM"));
        task.setTimezone(timezone);
        task.setInputParams(inputParams);
        task.setEnabled(Boolean.TRUE.equals(req.getEnabled()));
        task.setNextFireTime(Boolean.TRUE.equals(req.getEnabled())
                ? nextFireTime(req.getCronExpression(), timezone, new Date())
                : null);
    }

    private Workflow validatePublishedWorkflow(String flowId) {
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class)
                .eq(Workflow::getFlowId, flowId)
                .eq(Workflow::getDeleted, false)
                .last("limit 1"));
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        if (!isPublished(workflow)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_PUBLISH);
        }
        dataPermissionCheckTool.checkWorkflowBelong(workflow, SpaceInfoUtil.getSpaceId());
        return workflow;
    }

    private WorkflowAutomationTask requireTask(Long id) {
        WorkflowAutomationTask task = getById(id);
        if (task == null || Boolean.TRUE.equals(task.getDeleted())) {
            throw new BusinessException(ResponseEnum.DATA_NOT_EXIST);
        }
        Long spaceId = SpaceInfoUtil.getSpaceId();
        String uid = UserInfoManagerHandler.getUserId();
        boolean denied = spaceId == null
                ? !Objects.equals(task.getUid(), uid)
                : !Objects.equals(task.getSpaceId(), spaceId);
        if (denied) {
            throw new BusinessException(ResponseEnum.EXCEED_AUTHORITY);
        }
        return task;
    }

    private LambdaQueryWrapper<WorkflowAutomationTask> scopedTaskQuery() {
        LambdaQueryWrapper<WorkflowAutomationTask> wrapper = Wrappers.lambdaQuery(WorkflowAutomationTask.class);
        Long spaceId = SpaceInfoUtil.getSpaceId();
        if (spaceId == null) {
            wrapper.eq(WorkflowAutomationTask::getUid, UserInfoManagerHandler.getUserId());
        } else {
            wrapper.eq(WorkflowAutomationTask::getSpaceId, spaceId);
        }
        return wrapper;
    }

    private String normalizeInputParams(String inputParams) {
        String normalized = StringUtils.defaultIfBlank(inputParams, "{}");
        try {
            JSONObject jsonObject = JSON.parseObject(normalized);
            return jsonObject == null ? "{}" : jsonObject.toJSONString();
        } catch (JSONException e) {
            throw new BusinessException(ResponseEnum.PARAMS_ERROR, "inputParams must be a JSON object");
        }
    }

    private CronExpression parseCron(String cronExpression) {
        try {
            return CronExpression.parse(StringUtils.trim(cronExpression));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ResponseEnum.PARAMS_ERROR, "invalid cron expression");
        }
    }

    private ZoneId parseZone(String timezone) {
        try {
            return ZoneId.of(StringUtils.defaultIfBlank(timezone, DEFAULT_TIMEZONE));
        } catch (Exception e) {
            throw new BusinessException(ResponseEnum.PARAMS_ERROR, "invalid timezone");
        }
    }

    private Date nextFireTime(String cronExpression, String timezone, Date from) {
        ZoneId zoneId = parseZone(timezone);
        ZonedDateTime next = parseCron(cronExpression).next(ZonedDateTime.ofInstant(from.toInstant(), zoneId));
        if (next == null) {
            throw new BusinessException(ResponseEnum.PARAMS_ERROR, "cron has no future fire time");
        }
        return Date.from(next.toInstant());
    }

    private WorkflowAutomationRun createRun(WorkflowAutomationTask task, String triggerType, Date scheduledFireTime) {
        Date now = new Date();
        WorkflowAutomationRun run = new WorkflowAutomationRun();
        run.setTaskId(task.getId());
        run.setFlowId(task.getFlowId());
        run.setUid(task.getUid());
        run.setSpaceId(task.getSpaceId());
        run.setTriggerType(triggerType);
        run.setScheduledFireTime(scheduledFireTime);
        run.setStartTime(now);
        run.setStatus(STATUS_RUNNING);
        run.setRequestParams(task.getInputParams());
        run.setCreateTime(now);
        runMapper.insert(run);
        return run;
    }

    private WorkflowAutomationRun recordSkipped(WorkflowAutomationTask task, String triggerType,
            Date scheduledFireTime, String message) {
        WorkflowAutomationRun run = new WorkflowAutomationRun();
        Date now = new Date();
        run.setTaskId(task.getId());
        run.setFlowId(task.getFlowId());
        run.setUid(task.getUid());
        run.setSpaceId(task.getSpaceId());
        run.setTriggerType(triggerType);
        run.setScheduledFireTime(scheduledFireTime);
        run.setStartTime(now);
        run.setEndTime(now);
        run.setStatus(STATUS_SKIPPED);
        run.setRequestParams(task.getInputParams());
        run.setErrorMessage(message);
        run.setDurationMs(0L);
        run.setCreateTime(now);
        runMapper.insert(run);

        task.setLastRunTime(now);
        task.setLastRunStatus(STATUS_SKIPPED);
        task.setLastRunMessage(message);
        if (TRIGGER_SCHEDULE.equals(triggerType) && Boolean.TRUE.equals(task.getEnabled())) {
            task.setNextFireTime(nextFireTime(task.getCronExpression(), task.getTimezone(), now));
        }
        task.setUpdateTime(now);
        updateById(task);
        return run;
    }

    private void completeRun(WorkflowAutomationRun run, WorkflowAutomationTask task, String triggerType, String status,
            String response, String error, long durationMs) {
        Date now = new Date();
        run.setEndTime(now);
        run.setStatus(status);
        run.setResponseSummary(abbreviate(response));
        run.setErrorMessage(abbreviate(error));
        run.setDurationMs(durationMs);
        runMapper.updateById(run);

        task.setLastRunTime(now);
        task.setLastRunStatus(status);
        task.setLastRunMessage(STATUS_SUCCESS.equals(status)
                ? "Workflow executed successfully"
                : StringUtils.abbreviate(error, 512));
        if (TRIGGER_SCHEDULE.equals(triggerType) && Boolean.TRUE.equals(task.getEnabled())) {
            task.setNextFireTime(nextFireTime(task.getCronExpression(), task.getTimezone(), now));
        }
        task.setUpdateTime(now);
        updateById(task);
    }

    private String executeWorkflow(WorkflowAutomationTask task, Long runId) {
        Workflow workflow = workflowMapper.selectOne(Wrappers.lambdaQuery(Workflow.class)
                .eq(Workflow::getFlowId, task.getFlowId())
                .eq(Workflow::getDeleted, false)
                .last("limit 1"));
        validateWorkflowStillAccessible(task, workflow);

        AkSk akSk = appService.remoteCallAkSk(workflow.getAppId());
        if (akSk == null || StringUtils.isBlank(akSk.getApiKey()) || StringUtils.isBlank(akSk.getApiSecret())) {
            throw new BusinessException(ResponseEnum.RESPONSE_FAILED, "workflow app credential is missing");
        }

        Map<String, String> headerMap = new HashMap<>();
        headerMap.put(HttpHeaders.AUTHORIZATION, akSk.getApiKey() + ":" + akSk.getApiSecret());
        headerMap.put("X-Consumer-Username", workflow.getAppId());

        String response = callWorkflow(task, runId, headerMap, task.getVersion());
        Integer code = workflowResponseCode(response);
        if (Objects.equals(code, CORE_WORKFLOW_NOT_PUBLISHED_CODE) && StringUtils.isNotBlank(task.getVersion())) {
            log.warn("[workflow automation] call workflow with version failed, retry latest published version, taskId={}, runId={}, flowId={}, version={}",
                    task.getId(), runId, task.getFlowId(), task.getVersion());
            response = callWorkflow(task, runId, headerMap, null);
        }
        return validateWorkflowResponse(response);
    }

    private String callWorkflow(WorkflowAutomationTask task, Long runId, Map<String, String> headerMap,
            String version) {
        ChatSysReq sysReq = buildWorkflowRequest(task, runId, version);
        String reqBody = JacksonUtil.toJSONString(sysReq, JacksonUtil.NON_NULL_OBJECT_MAPPER);
        log.info("[workflow automation] call workflow, taskId={}, runId={}, flowId={}",
                task.getId(), runId, task.getFlowId());
        return OkHttpUtil.post(workflowChatUrl(), headerMap, reqBody);
    }

    private ChatSysReq buildWorkflowRequest(WorkflowAutomationTask task, Long runId, String version) {
        ChatSysReq sysReq = new ChatSysReq();
        sysReq.setFlowId(task.getFlowId());
        sysReq.setStream(false);
        sysReq.setDebug(false);
        sysReq.setParameters(JSON.parseObject(task.getInputParams()));
        sysReq.setUid(task.getUid());
        sysReq.setVersion(StringUtils.trimToNull(version));
        sysReq.setChatId("automation-" + task.getId() + "-" + runId);
        return sysReq;
    }

    private void validateWorkflowStillAccessible(WorkflowAutomationTask task, Workflow workflow) {
        if (workflow == null) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_EXIST);
        }
        if (!isPublished(workflow)) {
            throw new BusinessException(ResponseEnum.WORKFLOW_NOT_PUBLISH);
        }
        boolean denied = task.getSpaceId() == null
                ? (!Boolean.TRUE.equals(workflow.getIsPublic()) && !Objects.equals(workflow.getUid(), task.getUid()))
                : (!Boolean.TRUE.equals(workflow.getIsPublic()) && !Objects.equals(workflow.getSpaceId(), task.getSpaceId()));
        if (denied) {
            throw new BusinessException(ResponseEnum.EXCEED_AUTHORITY);
        }
    }

    private String abbreviate(String value) {
        if (value == null) {
            return null;
        }
        return StringUtils.abbreviate(value, MAX_RESPONSE_SUMMARY_LENGTH);
    }

    private String validateWorkflowResponse(String response) {
        if (StringUtils.isBlank(response)) {
            throw new BusinessException(ResponseEnum.RESPONSE_FAILED, "workflow response is empty");
        }
        try {
            JSONObject jsonObject = JSON.parseObject(response);
            Integer code = responseCode(jsonObject);
            if (code != null && code != 0) {
                String message = StringUtils.defaultIfBlank(jsonObject.getString("message"), "workflow execution failed");
                throw new BusinessException(ResponseEnum.RESPONSE_FAILED, message + " (code=" + code + ")");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.debug("[workflow automation] response is not JSON, treat as success");
        }
        return response;
    }

    private Integer workflowResponseCode(String response) {
        if (StringUtils.isBlank(response)) {
            return null;
        }
        try {
            return responseCode(JSON.parseObject(response));
        } catch (Exception e) {
            return null;
        }
    }

    private Integer responseCode(JSONObject jsonObject) {
        return jsonObject == null ? null : jsonObject.getInteger("code");
    }

    private String workflowChatUrl() {
        return apiUrl.getWorkflow().concat("/workflow/v1/chat/completions");
    }

    private boolean isPublished(Workflow workflow) {
        if (Objects.equals(workflow.getStatus(), WorkflowConst.Status.PUBLISHED)) {
            return true;
        }
        return latestPublishedVersion(workflow.getFlowId()) != null;
    }

    private WorkflowVersion latestPublishedVersion(String flowId) {
        return workflowVersionMapper.selectOne(Wrappers.lambdaQuery(WorkflowVersion.class)
                .eq(WorkflowVersion::getFlowId, flowId)
                .in(WorkflowVersion::getPublishResult,
                        WorkflowConst.PublishResult.SUCCESS,
                        WorkflowConst.PublishResult.LEGACY_SUCCESS,
                        WorkflowConst.PublishResult.LEGACY_SUCCESS_UPPER)
                .orderByDesc(WorkflowVersion::getCreatedTime)
                .last("limit 1"));
    }

    private <T> PageData<T> toPageData(Page<T> page) {
        PageData<T> pageData = new PageData<>();
        pageData.setPage((int) page.getCurrent());
        pageData.setPageSize((int) page.getSize());
        pageData.setTotalCount(page.getTotal());
        pageData.setTotalPages(page.getPages());
        pageData.setPageData(page.getRecords());
        return pageData;
    }
}
