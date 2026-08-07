# Base DSL schema
BASE_DSL_SCHEMA = """{
    "data": {
        "edges": [
            {
                "sourceNodeId": "node-start::d61b0f71-87ee-475e-93ba-f1607f0ce783",
                "targetNodeId": "text-joiner::5804eefe-94fd-48a8-9873-b4bf6213c34d"
            },
            {
                "sourceNodeId": "text-joiner::5804eefe-94fd-48a8-9873-b4bf6213c34d",
                "targetHandle": "node-end::cda617af-551e-462e-b3b8-3bb9a041bf88",
                "targetNodeId": "node-end::cda617af-551e-462e-b3b8-3bb9a041bf88"
            }
        ],
        "nodes": [
            {
                "data": {
                    "inputs": [],
                    "nodeMeta": {
                        "aliasName": "开始",
                        "nodeType": "基础节点"
                    },
                    "nodeParam": {},
                    "outputs": [
                        {
                            "id": "0918514b-72a8-4646-8dd9-ff4a8fc26d44",
                            "name": "AGENT_USER_INPUT",
                            "required": true,
                            "schema": {
                                "description": "用户本轮对话输入内容",
                                "type": "string"
                            }
                        }
                    ]
                },
                "id": "node-start::d61b0f71-87ee-475e-93ba-f1607f0ce783"
            },
            {
                "data": {
                    "inputs": [
                        {
                            "fileType": "",
                            "id": "82de2b42-a059-4c98-bffb-b6b4800fcac9",
                            "name": "output",
                            "schema": {
                                "type": "string",
                                "value": {
                                    "content": {
                                        "id": "0918514b-72a8-4646-8dd9-ff4a8fc26d44",
                                        "nodeId": "node-start::d61b0f71-87ee-475e-93ba-f1607f0ce783",
                                        "name": "AGENT_USER_INPUT"
                                    },
                                    "type": "ref"
                                }
                            }
                        }
                    ],
                    "nodeMeta": {
                        "aliasName": "结束",
                        "nodeType": "基础节点"
                    },
                    "nodeParam": {
                        "template": "{{output}}",
                        "streamOutput": true,
                        "templateErrMsg": "",
                        "outputMode": 1
                    },
                    "outputs": []
                },
                "id": "node-end::cda617af-551e-462e-b3b8-3bb9a041bf88"
            },
            {
                "data": {
                    "inputs": [
                        {
                            "fileType": "",
                            "id": "ef87fdfc-0c93-497a-968d-c8ac41bb3ad3",
                            "name": "input",
                            "schema": {
                                "type": "string",
                                "value": {
                                    "content": {
                                        "id": "0918514b-72a8-4646-8dd9-ff4a8fc26d44",
                                        "nodeId": "node-start::d61b0f71-87ee-475e-93ba-f1607f0ce783",
                                        "name": "AGENT_USER_INPUT"
                                    },
                                    "type": "ref"
                                }
                            }
                        }
                    ],
                    "nodeMeta": {
                        "aliasName": "文本处理节点_1",
                        "nodeType": "工具"
                    },
                    "nodeParam": {
                        "uid": "1600610195",
                        "separatorErrMsg": "",
                        "prompt": "{{input}}"
                    },
                    "outputs": [
                        {
                            "id": "e98528d8-bf97-4227-b155-c8e788545fd4",
                            "name": "output",
                            "schema": {
                                "type": "string"
                            }
                        }
                    ]
                },
                "id": "text-joiner::5804eefe-94fd-48a8-9873-b4bf6213c34d"
            }
        ]
    },
    "description": "",
    "id": "7377160056403927042",
    "name": "自定义1758852017320",
    "version": "v3.0.0"
}"""
