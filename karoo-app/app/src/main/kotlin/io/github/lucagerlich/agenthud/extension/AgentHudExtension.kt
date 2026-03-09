package io.github.lucagerlich.agenthud.extension

import android.util.Log
import io.hammerhead.karooext.extension.KarooExtension
import io.github.lucagerlich.agenthud.data.AgentProgressDataType
import io.github.lucagerlich.agenthud.data.AgentQuestionsDataType
import io.github.lucagerlich.agenthud.data.AgentStatusDataType
import io.github.lucagerlich.agenthud.network.BridgeClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class AgentHudExtension : KarooExtension("agent-hud", "0.1.0") {
    companion object {
        private const val TAG = "AgentHud"
    }

    private lateinit var bridgeClient: BridgeClient
    private var serviceJob: Job? = null

    override val types by lazy {
        listOf(
            AgentProgressDataType(bridgeClient, extension),
            AgentQuestionsDataType(bridgeClient, extension),
            AgentStatusDataType(bridgeClient, extension),
        )
    }

    override fun onCreate() {
        super.onCreate()
        bridgeClient = BridgeClient(this)
        Log.d(TAG, "Agent HUD extension created")

        if (bridgeClient.isPaired) {
            serviceJob = CoroutineScope(Dispatchers.IO).launch {
                bridgeClient.startPolling(this)
            }
        }
    }

    override fun onBonusAction(actionId: String) {
        Log.d(TAG, "Bonus action: $actionId")
        CoroutineScope(Dispatchers.IO).launch {
            when (actionId) {
                "cycle-agent" -> {
                    val agents = bridgeClient.agentList.value
                    if (agents != null && agents.agents.isNotEmpty()) {
                        val currentId = agents.activeAgentId
                        val ids = agents.agents.map { it.id }
                        val currentIndex = ids.indexOf(currentId)
                        val nextIndex = (currentIndex + 1) % ids.size
                        bridgeClient.setActiveAgent(ids[nextIndex])
                    }
                }
                "approve-action" -> {
                    val activeId = bridgeClient.agentList.value?.activeAgentId
                    if (activeId != null) {
                        bridgeClient.postAction(activeId, "approve")
                    }
                }
                else -> Log.w(TAG, "Unknown action: $actionId")
            }
        }
    }

    override fun onDestroy() {
        serviceJob?.cancel()
        serviceJob = null
        bridgeClient.stopPolling()
        super.onDestroy()
    }
}
