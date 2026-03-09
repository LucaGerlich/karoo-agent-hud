package io.github.lucagerlich.agenthud.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import io.github.lucagerlich.agenthud.network.AgentSummary

@Composable
fun AgentStatusView(summary: AgentSummary?, isConnected: Boolean) {
    if (!isConnected) {
        OfflineView()
        return
    }

    if (summary == null) {
        NoAgentsView()
        return
    }

    val isWaiting = summary.status == "waiting"
    val bgColor = if (isWaiting) Color(0xFFFFA000) else Color.Transparent

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(bgColor)
            .padding(4.dp),
    ) {
        // Row 1: Name + progress/questions
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.Horizontal.Start,
        ) {
            Text(
                text = summary.name,
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = ColorProvider(Color.White),
                ),
            )
            Spacer(modifier = GlanceModifier.defaultWeight())
            if (isWaiting) {
                Text(
                    text = "? x ${summary.pendingQuestions}",
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = ColorProvider(Color.White),
                    ),
                )
            } else {
                Text(
                    text = "${summary.progress}%",
                    style = TextStyle(
                        fontSize = 14.sp,
                        color = ColorProvider(Color.White),
                    ),
                )
            }
        }

        // Row 2: Phase
        Text(
            text = if (isWaiting) "WAITING" else summary.phase,
            style = TextStyle(
                fontSize = 12.sp,
                color = ColorProvider(if (isWaiting) Color.White else Color.LightGray),
            ),
        )

        // Row 3: Status line
        Text(
            text = if (isWaiting) "Permission needed" else summary.statusLine,
            style = TextStyle(
                fontSize = 11.sp,
                color = ColorProvider(Color.LightGray),
            ),
        )
    }
}

@Composable
private fun OfflineView() {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(4.dp),
        verticalAlignment = Alignment.Vertical.CenterVertically,
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
    ) {
        Text(
            text = "Bridge Offline",
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = ColorProvider(Color.Gray),
            ),
        )
    }
}

@Composable
private fun NoAgentsView() {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(4.dp),
        verticalAlignment = Alignment.Vertical.CenterVertically,
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
    ) {
        Text(
            text = "No agents",
            style = TextStyle(
                fontSize = 14.sp,
                color = ColorProvider(Color.Gray),
            ),
        )
    }
}
