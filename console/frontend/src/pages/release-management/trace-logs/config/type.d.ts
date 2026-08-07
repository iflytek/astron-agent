import React from 'react';

interface DataType {
  status: boolean;
  sid: string;
  uid: string;
  question: string;
  answer: string;
  duration: number;
  startTime: string;
  endTime: string;
  questionTokens?: number;
  answerTokens?: number;
  totalTokens?: number;
  traceId?: string;
  input?: string;
  output?: string;
  tokens?: string;
  inputTokens?: string;
  outputTokens?: string;
  latency?: string;
  latencyFirstResp?: string;
  spanId?: string;
  trace?: any[];
  statusCode?: string;
}

interface TimeOption {
  key: string;
  label: React.ReactNode;
  value: string;
}

export type { DataType, TimeOption };
