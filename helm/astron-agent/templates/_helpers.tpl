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

{{/* Resolve the single managed or external Secret shared by MinIO and S3 clients. */}}
{{- define "astron-agent.minioSecretName" -}}
{{- $auth := default (dict) .Values.minio.auth -}}
{{- $existing := default "" (get $auth "existingSecret") | toString | trim -}}
{{- if $existing -}}
{{- $existing -}}
{{- else -}}
{{- printf "%s-minio-credentials" (include "astron-agent.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.minioSecretUserKey" -}}
{{- $auth := default (dict) .Values.minio.auth -}}
{{- required "minio.auth.rootUserKey is required" (get $auth "rootUserKey") -}}
{{- end }}

{{- define "astron-agent.minioSecretPasswordKey" -}}
{{- $auth := default (dict) .Values.minio.auth -}}
{{- required "minio.auth.rootPasswordKey is required" (get $auth "rootPasswordKey") -}}
{{- end }}

{{/* Stable non-secret rollout marker for the shared object-storage Secret. */}}
{{- define "astron-agent.minioSecretChecksum" -}}
{{- $auth := default (dict) .Values.minio.auth -}}
{{- $existing := default "" (get $auth "existingSecret") | toString | trim -}}
{{- if $existing -}}
{{- printf "%s:%s:%s:%s" $existing (include "astron-agent.minioSecretUserKey" .) (include "astron-agent.minioSecretPasswordKey" .) (default "" (get $auth "existingSecretChecksum")) | sha256sum -}}
{{- else -}}
{{- $rootUser := required "minio.auth.rootUser is required when minio.auth.existingSecret is empty" (get $auth "rootUser") | toString -}}
{{- $rootPassword := required "minio.auth.rootPassword is required when minio.auth.existingSecret is empty" (get $auth "rootPassword") | toString -}}
{{- printf "%s:%s:%s:%s:%s" (include "astron-agent.minioSecretName" .) (include "astron-agent.minioSecretUserKey" .) (include "astron-agent.minioSecretPasswordKey" .) $rootUser $rootPassword | sha256sum -}}
{{- end -}}
{{- end }}

{{/* Cluster-internal S3 endpoint, or an explicit endpoint when MinIO is external. */}}
{{- define "astron-agent.minioEndpoint" -}}
{{- $endpoint := "" -}}
{{- if .Values.minio.enabled -}}
{{- $endpoint = printf "http://%s-minio:%d" (include "astron-agent.fullname" .) (.Values.minio.service.apiPort | int) -}}
{{- else -}}
{{- $external := default (dict) .Values.minio.external -}}
{{- $endpoint = required "minio.external.endpoint is required when minio.enabled=false and an enabled service uses object storage" (get $external "endpoint") | toString | trim -}}
{{- end -}}
{{- if not (regexMatch "^https?://(\\[[0-9A-Fa-f:.]+\\]|[A-Za-z0-9._-]+)(:[0-9]+)?/?$" $endpoint) -}}
{{- fail "the configured MinIO/S3 endpoint must be an exact http(s) origin without userinfo, path, query parameters, or fragments" -}}
{{- end -}}
{{- $endpoint | trimSuffix "/" -}}
{{- end }}

{{/* Endpoint embedded in presigned/download URLs; never implies Service exposure. */}}
{{- define "astron-agent.minioPublicEndpoint" -}}
{{- $configured := default "" .Values.minio.publicEndpoint | toString | trim -}}
{{- if not .Values.minio.enabled -}}
{{- $external := default (dict) .Values.minio.external -}}
{{- $externalPublic := default "" (get $external "publicEndpoint") | toString | trim -}}
{{- if $externalPublic -}}{{- $configured = $externalPublic -}}{{- end -}}
{{- end -}}
{{- if not $configured -}}{{- $configured = include "astron-agent.minioEndpoint" . -}}{{- end -}}
{{- if not (regexMatch "^https?://(\\[[0-9A-Fa-f:.]+\\]|[A-Za-z0-9._-]+)(:[0-9]+)?/?$" $configured) -}}
{{- fail "minio.publicEndpoint/minio.external.publicEndpoint must be an exact http(s) origin without userinfo, path, query parameters, or fragments" -}}
{{- end -}}
{{- $configured | trimSuffix "/" -}}
{{- end }}

{{/* Resolve chart-managed or external Workflow internal authentication. */}}
{{- define "astron-agent.workflowInternalAuthValidate" -}}
{{- $config := default (dict) .Values.workflowInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if $externalName -}}
{{- $externalKey := required "workflowInternalAuth.existingSecret.key is required when using an existing Secret" (get $external "key") | toString -}}
{{- if not (regexMatch "^[A-Za-z0-9._-]+$" $externalKey) -}}
{{- fail "workflowInternalAuth.existingSecret.key may contain only letters, digits, '.', '_' or '-'" -}}
{{- end -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.workflowInternalAuthSecretName" -}}
{{- include "astron-agent.workflowInternalAuthValidate" . -}}
{{- $config := default (dict) .Values.workflowInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if $externalName -}}
{{- $externalName -}}
{{- else -}}
{{- printf "%s-workflow-internal-auth" (include "astron-agent.fullname" .) -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.workflowInternalAuthSecretKey" -}}
{{- $config := default (dict) .Values.workflowInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if $externalName -}}
{{- required "workflowInternalAuth.existingSecret.key is required when using an existing Secret" (get $external "key") -}}
{{- else -}}
workflow-internal-api-key
{{- end -}}
{{- end }}

{{/*
Hash a valid persisted managed key so upgrades remain stable. Missing, short,
oversized, multiline, or published-placeholder values receive a random rollout
marker and are replaced by the managed Secret template. External Secrets are
never read; operators advance their non-secret checksum marker when rotating.
*/}}
{{- define "astron-agent.workflowInternalAuthSecretChecksum" -}}
{{- include "astron-agent.workflowInternalAuthValidate" . -}}
{{- $config := default (dict) .Values.workflowInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- $secretName := include "astron-agent.workflowInternalAuthSecretName" . -}}
{{- $secretKey := include "astron-agent.workflowInternalAuthSecretKey" . -}}
{{- if $externalName -}}
{{- printf "%s:%s:%s" $secretName $secretKey (default "" (get $external "checksum")) | sha256sum -}}
{{- else -}}
{{- $existingSecret := lookup "v1" "Secret" .Release.Namespace $secretName -}}
{{- $existingData := dict -}}
{{- if $existingSecret -}}
{{- $existingData = default (dict) (get $existingSecret "data") -}}
{{- end -}}
{{- $resolvedKey := "" -}}
{{- if hasKey $existingData $secretKey -}}
{{- $candidateKey := index $existingData $secretKey | b64dec -}}
{{- if and (ge (len $candidateKey) 32) (le (len $candidateKey) 128) (not (contains "\r" $candidateKey)) (not (contains "\n" $candidateKey)) (ne $candidateKey "CHANGE_ME_WORKFLOW_INTERNAL_API_KEY") -}}
{{- $resolvedKey = $candidateKey -}}
{{- end -}}
{{- end -}}
{{- if not $resolvedKey -}}
{{- $resolvedKey = randAlphaNum 64 -}}
{{- end -}}
{{- printf "%s:%s" $secretName $resolvedKey | sha256sum -}}
{{- end -}}
{{- end }}

{{/* Resolve the independent Agent Runtime management credential. */}}
{{- define "astron-agent.runtimeInternalAuthValidate" -}}
{{- $config := default (dict) .Values.runtimeInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- $runtimeName := default (printf "%s-runtime-internal-auth" (include "astron-agent.fullname" .)) $externalName -}}
{{- $runtimeKey := default "runtime-internal-api-key" (get $external "key") | toString -}}
{{- $workflowConfig := default (dict) .Values.workflowInternalAuth -}}
{{- $workflowExternal := default (dict) (get $workflowConfig "existingSecret") -}}
{{- $workflowExternalName := default "" (get $workflowExternal "name") | toString | trim -}}
{{- $workflowName := default (printf "%s-workflow-internal-auth" (include "astron-agent.fullname" .)) $workflowExternalName -}}
{{- $workflowKey := default "workflow-internal-api-key" (get $workflowExternal "key") | toString -}}
{{- if $externalName -}}
{{- $externalKey := required "runtimeInternalAuth.existingSecret.key is required when using an existing Secret" (get $external "key") | toString -}}
{{- if not (regexMatch "^[A-Za-z0-9._-]+$" $externalKey) -}}
{{- fail "runtimeInternalAuth.existingSecret.key may contain only letters, digits, '.', '_' or '-'" -}}
{{- end -}}
{{- end -}}
{{- if and (eq $runtimeName $workflowName) (eq $runtimeKey $workflowKey) -}}
{{- fail "runtimeInternalAuth must not reuse the workflow internal credential" -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.runtimeInternalAuthSecretName" -}}
{{- include "astron-agent.runtimeInternalAuthValidate" . -}}
{{- $config := default (dict) .Values.runtimeInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if $externalName -}}
{{- $externalName -}}
{{- else -}}
{{- printf "%s-runtime-internal-auth" (include "astron-agent.fullname" .) -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.runtimeInternalAuthSecretKey" -}}
{{- $config := default (dict) .Values.runtimeInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if $externalName -}}
{{- required "runtimeInternalAuth.existingSecret.key is required when using an existing Secret" (get $external "key") -}}
{{- else -}}
runtime-internal-api-key
{{- end -}}
{{- end }}

{{- define "astron-agent.runtimeInternalAuthSecretChecksum" -}}
{{- include "astron-agent.runtimeInternalAuthValidate" . -}}
{{- $config := default (dict) .Values.runtimeInternalAuth -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- $secretName := include "astron-agent.runtimeInternalAuthSecretName" . -}}
{{- $secretKey := include "astron-agent.runtimeInternalAuthSecretKey" . -}}
{{- if $externalName -}}
{{- printf "%s:%s:%s" $secretName $secretKey (default "" (get $external "checksum")) | sha256sum -}}
{{- else -}}
{{- $existingSecret := lookup "v1" "Secret" .Release.Namespace $secretName -}}
{{- $existingData := dict -}}
{{- if $existingSecret -}}
{{- $existingData = default (dict) (get $existingSecret "data") -}}
{{- end -}}
{{- $resolvedKey := "" -}}
{{- if hasKey $existingData $secretKey -}}
{{- $candidateKey := index $existingData $secretKey | b64dec -}}
{{- if and (ge (len $candidateKey) 32) (le (len $candidateKey) 128) (not (contains "\r" $candidateKey)) (not (contains "\n" $candidateKey)) -}}
{{- $resolvedKey = $candidateKey -}}
{{- end -}}
{{- end -}}
{{- if not $resolvedKey -}}
{{- $resolvedKey = randAlphaNum 64 -}}
{{- end -}}
{{- printf "%s:%s" $secretName $resolvedKey | sha256sum -}}
{{- end -}}
{{- end }}

{{/*
Validate the shared tenant bootstrap configuration. Credentials are capped at
50 characters because Workflow's legacy app schema stores each value in a
varchar(50). Exact published legacy defaults are never accepted as overrides.
*/}}
{{- define "astron-agent.tenantBootstrapConfiguredKey" -}}
{{- $config := default (dict) .Values.tenantBootstrap -}}
{{- $rawKey := default "" (get $config "key") | toString -}}
{{- $rawSecret := default "" (get $config "secret") | toString -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- $key := $rawKey -}}
{{- if and (not $rawKey) (not $rawSecret) (not $externalName) -}}
{{- $consoleHub := default (dict) .Values.consoleHub -}}
{{- $legacyEnv := default (dict) (get $consoleHub "env") -}}
{{- $legacyKey := default "" (get $legacyEnv "tenantKey") | toString -}}
{{- $legacySecret := default "" (get $legacyEnv "tenantSecret") | toString -}}
{{- if not (and (eq $legacyKey "7b709739e8da44536127a333c7603a83") (eq $legacySecret "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy")) -}}
{{- $key = $legacyKey -}}
{{- end -}}
{{- end -}}
{{- $key -}}
{{- end }}

{{- define "astron-agent.tenantBootstrapConfiguredSecret" -}}
{{- $config := default (dict) .Values.tenantBootstrap -}}
{{- $rawKey := default "" (get $config "key") | toString -}}
{{- $rawSecret := default "" (get $config "secret") | toString -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- $secret := $rawSecret -}}
{{- if and (not $rawKey) (not $rawSecret) (not $externalName) -}}
{{- $consoleHub := default (dict) .Values.consoleHub -}}
{{- $legacyEnv := default (dict) (get $consoleHub "env") -}}
{{- $legacyKey := default "" (get $legacyEnv "tenantKey") | toString -}}
{{- $legacySecret := default "" (get $legacyEnv "tenantSecret") | toString -}}
{{- if not (and (eq $legacyKey "7b709739e8da44536127a333c7603a83") (eq $legacySecret "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy")) -}}
{{- $secret = $legacySecret -}}
{{- end -}}
{{- end -}}
{{- $secret -}}
{{- end }}

{{- define "astron-agent.tenantBootstrapValidate" -}}
{{- $config := default (dict) .Values.tenantBootstrap -}}
{{- $tenantID := default "680ab54f" (get $config "tenantId") | toString -}}
{{- if ne $tenantID "680ab54f" -}}
{{- fail "tenantBootstrap.tenantId must remain 680ab54f because persisted bootstrap data refers to this stable ID" -}}
{{- end -}}
{{- $rawKey := default "" (get $config "key") | toString -}}
{{- $rawSecret := default "" (get $config "secret") | toString -}}
{{- if ne (not $rawKey) (not $rawSecret) -}}
{{- fail "tenantBootstrap.key and tenantBootstrap.secret must be set together" -}}
{{- end -}}
{{- $key := include "astron-agent.tenantBootstrapConfiguredKey" . -}}
{{- $secret := include "astron-agent.tenantBootstrapConfiguredSecret" . -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if and $key (not $secret) -}}
{{- fail "tenantBootstrap.key and tenantBootstrap.secret must be set together" -}}
{{- end -}}
{{- if and $secret (not $key) -}}
{{- fail "tenantBootstrap.key and tenantBootstrap.secret must be set together" -}}
{{- end -}}
{{- if $key -}}
{{- if or (lt (len $key) 32) (gt (len $key) 50) (not (regexMatch "^[A-Za-z0-9._~-]+$" $key)) -}}
{{- fail "tenantBootstrap.key must contain 32-50 safe characters" -}}
{{- end -}}
{{- if or (lt (len $secret) 32) (gt (len $secret) 50) (not (regexMatch "^[A-Za-z0-9._~-]+$" $secret)) -}}
{{- fail "tenantBootstrap.secret must contain 32-50 safe characters" -}}
{{- end -}}
{{- if eq $key $secret -}}
{{- fail "tenantBootstrap.key and tenantBootstrap.secret must be independent values" -}}
{{- end -}}
{{- if or (eq $key "7b709739e8da44536127a333c7603a83") (eq $secret "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy") -}}
{{- fail "tenantBootstrap contains a published legacy credential; leave both values empty to let Helm rotate it automatically" -}}
{{- end -}}
{{- else if $externalName -}}
{{- $keyKey := required "tenantBootstrap.existingSecret.keyKey is required when using an existing Secret" (get $external "keyKey") | toString -}}
{{- $secretKey := required "tenantBootstrap.existingSecret.secretKey is required when using an existing Secret" (get $external "secretKey") | toString -}}
{{- if or (not (regexMatch "^[A-Za-z0-9._-]+$" $keyKey)) (not (regexMatch "^[A-Za-z0-9._-]+$" $secretKey)) -}}
{{- fail "tenantBootstrap existing Secret keys may contain only letters, digits, '.', '_' or '-'" -}}
{{- end -}}
{{- if eq $keyKey $secretKey -}}
{{- fail "tenantBootstrap.existingSecret.keyKey and secretKey must be different" -}}
{{- end -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.tenantBootstrapID" -}}
{{- include "astron-agent.tenantBootstrapValidate" . -}}
680ab54f
{{- end }}

{{- define "astron-agent.tenantBootstrapSecretName" -}}
{{- include "astron-agent.tenantBootstrapValidate" . -}}
{{- $config := default (dict) .Values.tenantBootstrap -}}
{{- $key := include "astron-agent.tenantBootstrapConfiguredKey" . -}}
{{- $secret := include "astron-agent.tenantBootstrapConfiguredSecret" . -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if or $key $secret (not $externalName) -}}
{{- printf "%s-tenant-bootstrap" (include "astron-agent.fullname" .) -}}
{{- else -}}
{{- $externalName -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.tenantBootstrapSecretKeyKey" -}}
{{- $config := default (dict) .Values.tenantBootstrap -}}
{{- $key := include "astron-agent.tenantBootstrapConfiguredKey" . -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if or $key (not $externalName) -}}tenant-key{{- else -}}
{{- required "tenantBootstrap.existingSecret.keyKey is required when using an existing Secret" (get $external "keyKey") -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.tenantBootstrapSecretSecretKey" -}}
{{- $config := default (dict) .Values.tenantBootstrap -}}
{{- $secret := include "astron-agent.tenantBootstrapConfiguredSecret" . -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- if or $secret (not $externalName) -}}tenant-secret{{- else -}}
{{- required "tenantBootstrap.existingSecret.secretKey is required when using an existing Secret" (get $external "secretKey") -}}
{{- end -}}
{{- end }}

{{/*
Roll consumers when explicit credentials change, when an operator advances the
external Secret checksum, or when a missing/invalid chart-managed Secret must
be regenerated. A valid managed pair is hashed and reused across live upgrades.
*/}}
{{- define "astron-agent.tenantBootstrapSecretChecksum" -}}
{{- include "astron-agent.tenantBootstrapValidate" . -}}
{{- $config := default (dict) .Values.tenantBootstrap -}}
{{- $key := include "astron-agent.tenantBootstrapConfiguredKey" . -}}
{{- $secret := include "astron-agent.tenantBootstrapConfiguredSecret" . -}}
{{- $external := default (dict) (get $config "existingSecret") -}}
{{- $externalName := default "" (get $external "name") | toString | trim -}}
{{- $secretName := include "astron-agent.tenantBootstrapSecretName" . -}}
{{- $keyKey := include "astron-agent.tenantBootstrapSecretKeyKey" . -}}
{{- $secretKey := include "astron-agent.tenantBootstrapSecretSecretKey" . -}}
{{- if $key -}}
{{- printf "%s:%s:%s" $secretName $key $secret | sha256sum -}}
{{- else if $externalName -}}
{{- printf "%s:%s:%s:%s" $secretName $keyKey $secretKey (default "" (get $config "existingSecretChecksum")) | sha256sum -}}
{{- else -}}
{{- $existingSecret := lookup "v1" "Secret" .Release.Namespace $secretName -}}
{{- $existingData := dict -}}
{{- if $existingSecret -}}
{{- $existingData = default (dict) (get $existingSecret "data") -}}
{{- end -}}
{{- $persistedKey := "" -}}
{{- $persistedSecret := "" -}}
{{- if and (hasKey $existingData $keyKey) (hasKey $existingData $secretKey) -}}
{{- $candidateKey := index $existingData $keyKey | b64dec -}}
{{- $candidateSecret := index $existingData $secretKey | b64dec -}}
{{- if and (ge (len $candidateKey) 32) (le (len $candidateKey) 50) (ge (len $candidateSecret) 32) (le (len $candidateSecret) 50) (regexMatch "^[A-Za-z0-9._~-]+$" $candidateKey) (regexMatch "^[A-Za-z0-9._~-]+$" $candidateSecret) (ne $candidateKey $candidateSecret) (ne $candidateKey "7b709739e8da44536127a333c7603a83") (ne $candidateSecret "NjhmY2NmM2NkZDE4MDFlNmM5ZjcyZjMy") -}}
{{- $persistedKey = $candidateKey -}}
{{- $persistedSecret = $candidateSecret -}}
{{- end -}}
{{- end -}}
{{- if not $persistedKey -}}
{{- $persistedKey = randAlphaNum 48 -}}
{{- $persistedSecret = randAlphaNum 48 -}}
{{- end -}}
{{- printf "%s:%s:%s" $secretName $persistedKey $persistedSecret | sha256sum -}}
{{- end -}}
{{- end }}

{{/* Resolve the managed or externally supplied artifact-upload Secret. */}}
{{- define "astron-agent.artifactUploadSecretName" -}}
{{- $config := default (dict) .Values.consoleHub.artifactUpload -}}
{{- $token := default "" (get $config "token") | toString | trim -}}
{{- $existingSecret := default "" (get $config "existingSecret") | toString | trim -}}
{{- if or $token (not $existingSecret) -}}
{{- printf "%s-console-hub-artifact-upload" (include "astron-agent.fullname" .) -}}
{{- else -}}
{{- $existingSecret -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.artifactUploadSecretKey" -}}
{{- $config := default (dict) .Values.consoleHub.artifactUpload -}}
{{- $token := default "" (get $config "token") | toString | trim -}}
{{- $existingSecret := default "" (get $config "existingSecret") | toString | trim -}}
{{- if or $token (not $existingSecret) -}}artifact-upload-token{{- else -}}
{{- required "consoleHub.artifactUpload.existingSecretKey is required when using an existing Secret" (get $config "existingSecretKey") -}}
{{- end -}}
{{- end }}

{{/*
Hash the explicit credential, a persisted chart-managed credential, or the
external Secret identity plus an operator-supplied rotation checksum.
When a managed Secret cannot be looked up (including offline rendering), use a
random marker so applying a newly generated Secret also rolls every consumer.
*/}}
{{- define "astron-agent.artifactUploadSecretChecksum" -}}
{{- $config := default (dict) .Values.consoleHub.artifactUpload -}}
{{- $token := default "" (get $config "token") | toString | trim -}}
{{- $existingSecretName := default "" (get $config "existingSecret") | toString | trim -}}
{{- if $token -}}
{{- printf "%s:%s" (include "astron-agent.artifactUploadSecretName" .) $token | sha256sum -}}
{{- else if $existingSecretName -}}
{{- printf "%s:%s:%s" (include "astron-agent.artifactUploadSecretName" .) (include "astron-agent.artifactUploadSecretKey" .) (default "" (get $config "existingSecretChecksum")) | sha256sum -}}
{{- else -}}
{{- $secretName := include "astron-agent.artifactUploadSecretName" . -}}
{{- $secretKey := include "astron-agent.artifactUploadSecretKey" . -}}
{{- $existingSecret := lookup "v1" "Secret" .Release.Namespace $secretName -}}
{{- $existingData := dict -}}
{{- if $existingSecret -}}
{{- $existingData = default (dict) (get $existingSecret "data") -}}
{{- end -}}
{{- $persistedToken := "" -}}
{{- if hasKey $existingData $secretKey -}}
{{- $candidateToken := index $existingData $secretKey | b64dec -}}
{{- if and (ge (len $candidateToken) 32) (not (contains "\r" $candidateToken)) (not (contains "\n" $candidateToken)) -}}
{{- $persistedToken = $candidateToken -}}
{{- end -}}
{{- end -}}
{{- if not $persistedToken -}}
{{- $persistedToken = randAlphaNum 64 -}}
{{- end -}}
{{- printf "%s:%s" $secretName $persistedToken | sha256sum -}}
{{- end -}}
{{- end }}

{{/* Resolve the independent sandbox runtime-credential Secret. */}}
{{- define "astron-agent.sandboxRuntimeCredentialSecretName" -}}
{{- $config := default (dict) .Values.consoleHub.sandboxRuntimeCredential -}}
{{- $token := default "" (get $config "token") | toString | trim -}}
{{- $existingSecret := default "" (get $config "existingSecret") | toString | trim -}}
{{- if or $token (not $existingSecret) -}}
{{- printf "%s-console-hub-sandbox-runtime-credential" (include "astron-agent.fullname" .) -}}
{{- else -}}
{{- $existingSecret -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.sandboxRuntimeCredentialSecretKey" -}}
{{- $config := default (dict) .Values.consoleHub.sandboxRuntimeCredential -}}
{{- $token := default "" (get $config "token") | toString | trim -}}
{{- $existingSecret := default "" (get $config "existingSecret") | toString | trim -}}
{{- if or $token (not $existingSecret) -}}sandbox-runtime-credential-token{{- else -}}
{{- required "consoleHub.sandboxRuntimeCredential.existingSecretKey is required when using an existing Secret" (get $config "existingSecretKey") -}}
{{- end -}}
{{- end }}

{{- define "astron-agent.sandboxRuntimeCredentialSecretChecksum" -}}
{{- $config := default (dict) .Values.consoleHub.sandboxRuntimeCredential -}}
{{- $token := default "" (get $config "token") | toString | trim -}}
{{- $existingSecretName := default "" (get $config "existingSecret") | toString | trim -}}
{{- if $token -}}
{{- printf "%s:%s" (include "astron-agent.sandboxRuntimeCredentialSecretName" .) $token | sha256sum -}}
{{- else if $existingSecretName -}}
{{- printf "%s:%s:%s" (include "astron-agent.sandboxRuntimeCredentialSecretName" .) (include "astron-agent.sandboxRuntimeCredentialSecretKey" .) (default "" (get $config "existingSecretChecksum")) | sha256sum -}}
{{- else -}}
{{- $secretName := include "astron-agent.sandboxRuntimeCredentialSecretName" . -}}
{{- $secretKey := include "astron-agent.sandboxRuntimeCredentialSecretKey" . -}}
{{- $existingSecret := lookup "v1" "Secret" .Release.Namespace $secretName -}}
{{- $existingData := dict -}}
{{- if $existingSecret -}}
{{- $existingData = default (dict) (get $existingSecret "data") -}}
{{- end -}}
{{- $persistedToken := "" -}}
{{- if hasKey $existingData $secretKey -}}
{{- $candidateToken := index $existingData $secretKey | b64dec -}}
{{- if and (ge (len $candidateToken) 32) (not (contains "\r" $candidateToken)) (not (contains "\n" $candidateToken)) -}}
{{- $persistedToken = $candidateToken -}}
{{- end -}}
{{- end -}}
{{- if not $persistedToken -}}
{{- $persistedToken = randAlphaNum 64 -}}
{{- end -}}
{{- printf "%s:%s" $secretName $persistedToken | sha256sum -}}
{{- end -}}
{{- end }}
