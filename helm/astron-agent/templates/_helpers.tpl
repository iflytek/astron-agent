{{/*
Expand the name of the chart.
*/}}
{{- define "astron-agent.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "astron-agent.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "astron-agent.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "astron-agent.labels" -}}
helm.sh/chart: {{ include "astron-agent.chart" . }}
{{ include "astron-agent.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "astron-agent.selectorLabels" -}}
app.kubernetes.io/name: {{ include "astron-agent.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "astron-agent.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "astron-agent.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
PostgreSQL host
*/}}
{{- define "astron-agent.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- printf "%s-postgres" (include "astron-agent.fullname" .) }}
{{- else }}
{{- .Values.postgresql.external.host }}
{{- end }}
{{- end }}

{{/*
MySQL host
*/}}
{{- define "astron-agent.mysql.host" -}}
{{- if .Values.mysql.enabled }}
{{- printf "%s-mysql" (include "astron-agent.fullname" .) }}
{{- else }}
{{- .Values.mysql.external.host }}
{{- end }}
{{- end }}

{{/*
Redis host
*/}}
{{- define "astron-agent.redis.host" -}}
{{- if .Values.redis.enabled }}
{{- printf "%s-redis" (include "astron-agent.fullname" .) }}
{{- else }}
{{- .Values.redis.external.host }}
{{- end }}
{{- end }}

{{/*
MinIO host
*/}}
{{- define "astron-agent.minio.host" -}}
{{- if .Values.minio.enabled }}
{{- printf "%s-minio" (include "astron-agent.fullname" .) }}
{{- else }}
{{- .Values.minio.external.host }}
{{- end }}
{{- end }}

{{/*
Casdoor host
*/}}
{{- define "astron-agent.casdoor.host" -}}
{{- if .Values.casdoor.enabled }}
{{- printf "%s-casdoor" (include "astron-agent.fullname" .) }}
{{- else }}
{{- .Values.casdoor.external.host }}
{{- end }}
{{- end }}

{{/*
Core service URLs - 用于生成完整的服务 URL（包括协议和端口）
*/}}
{{- define "astron-agent.coreTenant.url" -}}
{{- printf "http://%s-core-tenant:%d" (include "astron-agent.fullname" .) (.Values.coreTenant.service.port | int) }}
{{- end }}

{{- define "astron-agent.coreDatabase.url" -}}
{{- printf "http://%s-core-database:%d" (include "astron-agent.fullname" .) (.Values.coreDatabase.service.port | int) }}
{{- end }}

{{- define "astron-agent.coreRpa.url" -}}
{{- printf "http://%s-core-rpa:%d" (include "astron-agent.fullname" .) (.Values.coreRpa.service.port | int) }}
{{- end }}

{{- define "astron-agent.coreLink.url" -}}
{{- printf "http://%s-core-link:%d" (include "astron-agent.fullname" .) (.Values.coreLink.service.port | int) }}
{{- end }}

{{- define "astron-agent.coreAitools.url" -}}
{{- printf "http://%s-core-aitools:%d" (include "astron-agent.fullname" .) (.Values.coreAitools.service.port | int) }}
{{- end }}

{{- define "astron-agent.coreAgent.url" -}}
{{- printf "http://%s-core-agent:%d" (include "astron-agent.fullname" .) (.Values.coreAgent.service.port | int) }}
{{- end }}

{{- define "astron-agent.coreKnowledge.url" -}}
{{- printf "http://%s-core-knowledge:%d" (include "astron-agent.fullname" .) (.Values.coreKnowledge.service.port | int) }}
{{- end }}

{{- define "astron-agent.coreWorkflow.url" -}}
{{- printf "http://%s-core-workflow:%d" (include "astron-agent.fullname" .) (.Values.coreWorkflow.service.port | int) }}
{{- end }}
