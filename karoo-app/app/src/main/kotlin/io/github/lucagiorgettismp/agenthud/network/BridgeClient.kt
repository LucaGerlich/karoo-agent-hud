package io.github.lucagiorgettismp.agenthud.network

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class BridgeClient(context: Context) {
    companion object {
        private const val TAG = "AgentHud"
        private const val PREFS_NAME = "agent_hud_prefs"
        private const val KEY_BRIDGE_URL = "bridge_url"
        private const val KEY_TOKEN = "token"
        private const val KEY_POLL_INTERVAL = "poll_interval"
        private const val DEFAULT_POLL_INTERVAL = 3
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private val _agentList = MutableStateFlow<AgentListResponse?>(null)
    val agentList: StateFlow<AgentListResponse?> = _agentList

    private val _activeSummary = MutableStateFlow<AgentSummary?>(null)
    val activeSummary: StateFlow<AgentSummary?> = _activeSummary

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected

    private var pollingJob: Job? = null
    private var backoffMs = 3000L

    var bridgeUrl: String
        get() = prefs.getString(KEY_BRIDGE_URL, "") ?: ""
        set(value) = prefs.edit().putString(KEY_BRIDGE_URL, value).apply()

    var token: String
        get() = prefs.getString(KEY_TOKEN, "") ?: ""
        set(value) = prefs.edit().putString(KEY_TOKEN, value).apply()

    var pollIntervalSeconds: Int
        get() = prefs.getInt(KEY_POLL_INTERVAL, DEFAULT_POLL_INTERVAL)
        set(value) = prefs.edit().putInt(KEY_POLL_INTERVAL, value).apply()

    val isPaired: Boolean get() = token.isNotEmpty() && bridgeUrl.isNotEmpty()

    fun pair(url: String, code: String): PairResponse? {
        val body = json.encodeToString(PairRequest.serializer(), PairRequest(code))
        val request = Request.Builder()
            .url("$url/api/v1/pair")
            .post(body.toRequestBody("application/json".toMediaType()))
            .build()
        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val result = json.decodeFromString(PairResponse.serializer(), response.body!!.string())
                bridgeUrl = url
                token = result.token
                result
            } else null
        } catch (e: IOException) {
            Log.w(TAG, "Pair failed", e)
            null
        }
    }

    fun unpair() {
        token = ""
        prefs.edit().remove(KEY_TOKEN).apply()
        stopPolling()
    }

    fun startPolling(scope: CoroutineScope) {
        stopPolling()
        if (!isPaired) return
        pollingJob = scope.launch(Dispatchers.IO) {
            while (isActive) {
                try {
                    val agents = fetchAgentList()
                    if (agents != null) {
                        _agentList.value = agents
                        _isConnected.value = true
                        backoffMs = pollIntervalSeconds * 1000L

                        val activeId = agents.activeAgentId
                        if (activeId != null) {
                            val summary = fetchAgentSummary(activeId)
                            _activeSummary.value = summary
                        } else {
                            _activeSummary.value = null
                        }
                    } else {
                        _isConnected.value = false
                        backoffMs = (backoffMs * 2).coerceAtMost(30000L)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Poll error", e)
                    _isConnected.value = false
                    backoffMs = (backoffMs * 2).coerceAtMost(30000L)
                }
                delay(backoffMs)
            }
        }
    }

    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    private fun fetchAgentList(): AgentListResponse? {
        val request = Request.Builder()
            .url("$bridgeUrl/api/v1/agents")
            .addHeader("Authorization", "Bearer $token")
            .build()
        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                json.decodeFromString(AgentListResponse.serializer(), response.body!!.string())
            } else null
        } catch (e: IOException) {
            null
        }
    }

    private fun fetchAgentSummary(id: String): AgentSummary? {
        val request = Request.Builder()
            .url("$bridgeUrl/api/v1/agents/$id/summary")
            .addHeader("Authorization", "Bearer $token")
            .build()
        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                json.decodeFromString(AgentSummary.serializer(), response.body!!.string())
            } else null
        } catch (e: IOException) {
            null
        }
    }

    fun postAction(agentId: String, action: String): Boolean {
        val body = json.encodeToString(ActionRequest.serializer(), ActionRequest(action))
        val request = Request.Builder()
            .url("$bridgeUrl/api/v1/agents/$agentId/action")
            .addHeader("Authorization", "Bearer $token")
            .post(body.toRequestBody("application/json".toMediaType()))
            .build()
        return try {
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: IOException) {
            false
        }
    }

    fun setActiveAgent(agentId: String): Boolean {
        val body = json.encodeToString(ActiveRequest.serializer(), ActiveRequest(true))
        val request = Request.Builder()
            .url("$bridgeUrl/api/v1/agents/$agentId/active")
            .addHeader("Authorization", "Bearer $token")
            .post(body.toRequestBody("application/json".toMediaType()))
            .build()
        return try {
            val response = client.newCall(request).execute()
            response.isSuccessful
        } catch (e: IOException) {
            false
        }
    }
}
