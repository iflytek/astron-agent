ALTER TABLE repo
    ADD COLUMN ragflow_dataset_id VARCHAR(64) NULL
    COMMENT 'RAGFlow dataset.id for Ragflow-RAG repos; NULL uses the default dataset';

CREATE INDEX idx_repo_ragflow_dataset_id ON repo (ragflow_dataset_id);
