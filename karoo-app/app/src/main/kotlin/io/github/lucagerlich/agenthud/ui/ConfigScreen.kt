package io.github.lucagerlich.agenthud.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.lucagerlich.agenthud.network.BridgeClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Composable
fun ConfigScreen(bridgeClient: BridgeClient) {
    val scope = rememberCoroutineScope()
    var bridgeUrl by remember { mutableStateOf(bridgeClient.bridgeUrl) }
    var pairingCode by remember { mutableStateOf("") }
    var statusMessage by remember { mutableStateOf(if (bridgeClient.isPaired) "Connected" else "Not connected") }
    var pollInterval by remember { mutableFloatStateOf(bridgeClient.pollIntervalSeconds.toFloat()) }
    val isPaired = bridgeClient.isPaired

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Agent HUD",
                style = MaterialTheme.typography.headlineMedium,
            )

            if (!isPaired) {
                OutlinedTextField(
                    value = bridgeUrl,
                    onValueChange = { bridgeUrl = it },
                    label = { Text("Bridge URL") },
                    placeholder = { Text("http://192.168.1.100:7420") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                OutlinedTextField(
                    value = pairingCode,
                    onValueChange = { pairingCode = it },
                    label = { Text("Pairing Code") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )

                Button(
                    onClick = {
                        scope.launch(Dispatchers.IO) {
                            val result = bridgeClient.pair(bridgeUrl.trimEnd('/'), pairingCode)
                            statusMessage = if (result != null) {
                                "Connected to ${result.bridgeName}"
                            } else {
                                "Pairing failed"
                            }
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Pair")
                }
            } else {
                Text(
                    text = "Poll Interval: ${pollInterval.toInt()} seconds",
                    style = MaterialTheme.typography.bodyMedium,
                )
                Slider(
                    value = pollInterval,
                    onValueChange = {
                        pollInterval = it
                        bridgeClient.pollIntervalSeconds = it.toInt()
                    },
                    valueRange = 2f..10f,
                    steps = 7,
                    modifier = Modifier.fillMaxWidth(),
                )

                Button(
                    onClick = {
                        bridgeClient.unpair()
                        statusMessage = "Not connected"
                        bridgeUrl = ""
                        pairingCode = ""
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                    ),
                ) {
                    Text("Unpair")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = statusMessage,
                style = MaterialTheme.typography.bodyLarge,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
        }
    }
}
