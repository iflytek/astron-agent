package com.iflytek.astron.console.toolkit.entity.core.knowledge;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Request body for POST /v1/dataset/create. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DatasetCreateRequest {

    String name;

    String description;
}
