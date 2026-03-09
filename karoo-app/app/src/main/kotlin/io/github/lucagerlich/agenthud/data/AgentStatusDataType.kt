package io.github.lucagerlich.agenthud.data

import android.content.Context
import androidx.compose.ui.unit.DpSize
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceRemoteViews
import io.hammerhead.karooext.extension.DataTypeImpl
import io.hammerhead.karooext.internal.Emitter
import io.hammerhead.karooext.internal.ViewEmitter
import io.hammerhead.karooext.models.DataPoint
import io.hammerhead.karooext.models.DataType
import io.hammerhead.karooext.models.StreamState
import io.hammerhead.karooext.models.UpdateGraphicConfig
import io.hammerhead.karooext.models.ViewConfig
import io.github.lucagerlich.agenthud.network.AgentSummary
import io.github.lucagerlich.agenthud.network.BridgeClient
import io.github.lucagerlich.agenthud.ui.AgentStatusView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

@OptIn(ExperimentalGlanceRemoteViewsApi::class)
class AgentStatusDataType(
    private val bridgeClient: BridgeClient,
    extension: String,
) : DataTypeImpl(extension, "agent-status") {

    private val glance = GlanceRemoteViews()

    override fun startStream(emitter: Emitter<StreamState>) {
        emitter.onNext(StreamState.Searching)
        val job = CoroutineScope(Dispatchers.IO).launch {
            bridgeClient.activeSummary.collect { summary ->
                if (summary != null) {
                    emitter.onNext(
                        StreamState.Streaming(
                            DataPoint(
                                dataTypeId = dataTypeId,
                                values = mapOf(DataType.Field.SINGLE to summary.progress.toDouble()),
                            )
                        )
                    )
                } else {
                    emitter.onNext(StreamState.Searching)
                }
            }
        }
        emitter.setCancellable { job.cancel() }
    }

    override fun startView(context: Context, config: ViewConfig, emitter: ViewEmitter) {
        val configJob = CoroutineScope(Dispatchers.IO).launch {
            emitter.onNext(UpdateGraphicConfig(showHeader = false))
        }

        val viewJob = CoroutineScope(Dispatchers.IO).launch {
            combine(bridgeClient.activeSummary, bridgeClient.isConnected) { summary, connected ->
                Pair(summary, connected)
            }.collect { (summary, connected) ->
                val result = glance.compose(context, DpSize.Unspecified) {
                    AgentStatusView(summary, connected)
                }
                emitter.updateView(result.remoteViews)
            }
        }

        emitter.setCancellable {
            configJob.cancel()
            viewJob.cancel()
        }
    }
}
