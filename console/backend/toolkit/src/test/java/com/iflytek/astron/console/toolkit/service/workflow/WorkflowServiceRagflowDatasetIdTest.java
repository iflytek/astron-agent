package com.iflytek.astron.console.toolkit.service.workflow;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.iflytek.astron.console.toolkit.entity.biz.workflow.node.BizNodeData;
import com.iflytek.astron.console.toolkit.entity.table.repo.FileInfoV2;
import com.iflytek.astron.console.toolkit.entity.table.repo.Repo;
import com.iflytek.astron.console.toolkit.mapper.repo.FileInfoV2Mapper;
import com.iflytek.astron.console.toolkit.mapper.repo.RepoMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkflowServiceRagflowDatasetIdTest {

    @Mock
    private FileInfoV2Mapper fileInfoV2Mapper;

    @Mock
    private RepoMapper repoMapper;

    private WorkflowService workflowService;

    @BeforeEach
    void setUp() {
        workflowService = new WorkflowService();
        ReflectionTestUtils.setField(workflowService, "fileInfoV2Mapper", fileInfoV2Mapper);
        ReflectionTestUtils.setField(workflowService, "repoMapper", repoMapper);
    }

    @Test
    void setDocIdsAddsRagflowDatasetIdsFromRepoTable() {
        BizNodeData data = new BizNodeData();
        data.setNodeParam(new JSONObject());
        data.getNodeParam().put("datasetIds", new JSONArray(List.of("untrusted-dataset")));
        JSONArray repoIds = new JSONArray(List.of("repo-a", "repo-b"));

        FileInfoV2 fileInfo = new FileInfoV2();
        fileInfo.setUuid("doc-a");
        when(fileInfoV2Mapper.getFileInfoV2ByCoreRepoId("repo-a")).thenReturn(List.of(fileInfo));
        when(fileInfoV2Mapper.getFileInfoV2ByCoreRepoId("repo-b")).thenReturn(Collections.emptyList());

        Repo repo = new Repo();
        repo.setCoreRepoId("repo-a");
        repo.setRagflowDatasetId("dataset-a");
        when(repoMapper.listInRepoCoreIds(List.of("repo-a", "repo-b"))).thenReturn(List.of(repo));

        ReflectionTestUtils.invokeMethod(workflowService, "setDocIds", data, repoIds);

        assertThat(data.getNodeParam().getJSONArray("docIds")).containsExactly("doc-a");
        assertThat(data.getNodeParam().getJSONArray("datasetIds")).containsExactly("dataset-a");
    }

    @Test
    void enrichKnowledgeDocIdsAddsDatasetIdsToAgentMatch() {
        JSONArray knowledgeArray = new JSONArray();
        JSONObject knowledge = new JSONObject();
        JSONObject match = new JSONObject();
        match.put("repoIds", new JSONArray(List.of("repo-a")));
        match.put("datasetIds", new JSONArray(List.of("untrusted-dataset")));
        knowledge.put("match", match);
        knowledgeArray.add(knowledge);

        Repo repo = new Repo();
        repo.setCoreRepoId("repo-a");
        repo.setRagflowDatasetId("dataset-a");
        when(repoMapper.listInRepoCoreIds(List.of("repo-a"))).thenReturn(List.of(repo));

        ReflectionTestUtils.invokeMethod(workflowService, "enrichKnowledgeDocIds", knowledgeArray);

        assertThat(match.getJSONArray("datasetIds")).containsExactly("dataset-a");
    }
}
