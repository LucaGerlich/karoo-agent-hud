package io.github.lucagerlich.agenthud.data

import io.hammerhead.karooext.extension.DataTypeImpl
import io.hammerhead.karooext.internal.Emitter
import io.hammerhead.karooext.models.DataPoint
import io.hammerhead.karooext.models.DataType
import io.hammerhead.karooext.models.StreamState
import io.github.lucagerlich.agenthud.network.BridgeClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AgentProgressDataType(
    private val bridgeClient: BridgeClient,
    extension: String,
) : DataTypeImpl(extension, "agent-progress") {

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
}
