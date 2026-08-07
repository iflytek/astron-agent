package com.iflytek.astron.console.commons.service.data;

import com.iflytek.astron.console.commons.dto.dataset.DatasetStats;

import java.util.List;

public interface IDatasetFileService {

    List<DatasetStats> getMaasDataset(Long datasetId);

}
