package io.github.lucagiorgettismp.agenthud.network

import kotlinx.serialization.Serializable

@Serializable
data class AgentListItem(
    val id: String,
    val name: String,
    val type: String,
    val status: String,
    val progress: Int,
    val pendingQuestions: Int,
    val lastUpdate: String,
    val projectName: String,
)

@Serializable
data class AgentListResponse(
    val agents: List<AgentListItem>,
    val activeAgentId: String? = null,
)

@Serializable
data class AgentSummary(
    val id: String,
    val name: String,
    val type: String,
    val status: String,
    val phase: String,
    val progress: Int,
    val pendingQuestions: Int,
    val statusLine: String,
    val lastUpdate: String,
    val sessionId: String,
    val projectName: String,
    val startedAt: String,
    val toolCallCount: Int,
    val lastToolName: String? = null,
    val errorCount: Int,
    val stale: Boolean,
)

@Serializable
data class PairRequest(val pairingCode: String)

@Serializable
data class PairResponse(val token: String, val bridgeName: String)

@Serializable
data class ActionRequest(val action: String)

@Serializable
data class ActionResponse(val accepted: Boolean, val message: String)

@Serializable
data class ActiveRequest(val active: Boolean)

@Serializable
data class ActiveResponse(val activeAgentId: String)

@Serializable
data class HealthResponse(
    val status: String,
    val version: String,
    val uptime: Long,
    val agentCount: Int,
)
