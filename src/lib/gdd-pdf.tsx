import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { GddAudience, GddSection } from "./wizard-types";
import { AUDIENCE_LABELS } from "./gdd-export";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1a1a1a",
  },
  coverPage: {
    padding: 50,
    fontFamily: "Helvetica",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  coverTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#111827",
  },
  coverSubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 4,
  },
  coverMeta: {
    fontSize: 10,
    textAlign: "center",
    color: "#9ca3af",
    marginTop: 24,
  },
  tocTitle: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginBottom: 12,
    color: "#111827",
  },
  tocItem: {
    fontSize: 10,
    marginBottom: 4,
    color: "#374151",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    marginTop: 16,
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
  },
  sectionSource: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 8,
    fontStyle: "italic",
  },
  sectionContent: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 1.6,
  },
  noteBox: {
    backgroundColor: "#f9fafb",
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
    padding: 8,
    marginBottom: 12,
  },
  noteLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#3b82f6",
    marginBottom: 2,
  },
  noteText: {
    fontSize: 9,
    color: "#4b5563",
  },
  statusBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  readyBadge: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    fontSize: 8,
    color: "#9ca3af",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 12,
  },
});

interface GddPdfDocumentProps {
  gameName: string;
  audience: GddAudience;
  sections: GddSection[];
  customNotes: Record<string, string>;
  generatedDate: string;
}

/** Render a multi-line text block, splitting on newlines */
function ContentBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <View>
      {lines.map((line, i) => {
        // Strip markdown bold markers for PDF
        const clean = line.replace(/\*\*/g, "");
        return (
          <Text key={i} style={styles.sectionContent}>
            {clean}
          </Text>
        );
      })}
    </View>
  );
}

export function GddPdfDocument({
  gameName,
  audience,
  sections,
  customNotes,
  generatedDate,
}: GddPdfDocumentProps) {
  const audienceLabel = AUDIENCE_LABELS[audience].label;

  return (
    <Document title={`${gameName} — GDD`} author="SlotCraft">
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ marginTop: 200 }}>
          <Text style={styles.coverTitle}>{gameName}</Text>
          <Text style={styles.coverSubtitle}>Game Design Document</Text>
          <Text style={styles.coverSubtitle}>{audienceLabel}</Text>
          <Text style={styles.coverMeta}>Generated {generatedDate}</Text>
          <Text style={styles.coverMeta}>
            {sections.length} section{sections.length !== 1 ? "s" : ""} |{" "}
            {sections.filter((s) => s.ready).length} auto-generated
          </Text>
        </View>
      </Page>

      {/* Table of Contents */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>Table of Contents</Text>
        {sections.map((section, i) => (
          <Text key={section.id} style={styles.tocItem}>
            {i + 1}. {section.title}
            {section.ready ? "" : " (pending)"}
          </Text>
        ))}
        <View style={styles.footer}>
          <Text>{gameName} — {audienceLabel}</Text>
          <Text>SlotCraft</Text>
        </View>
      </Page>

      {/* Content Pages */}
      <Page size="A4" style={styles.page} wrap>
        {sections.map((section) => (
          <View key={section.id} wrap={false} minPresenceAhead={80}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSource}>
              Source: Step {section.source_step} —{" "}
              {section.ready ? "Auto-generated" : "Needs input"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                section.ready ? styles.readyBadge : styles.pendingBadge,
              ]}
            >
              <Text style={{ fontSize: 8 }}>
                {section.ready ? "Complete" : "Pending"}
              </Text>
            </View>
            <ContentBlock text={section.content} />
            {customNotes[section.id] ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Author Notes</Text>
                <Text style={styles.noteText}>{customNotes[section.id]}</Text>
              </View>
            ) : null}
            <View style={styles.divider} />
          </View>
        ))}
        <View style={styles.footer} fixed>
          <Text>{gameName} — {audienceLabel}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Generate a PDF blob from GDD sections */
export async function generateGddPdf(
  gameName: string,
  audience: GddAudience,
  sections: GddSection[],
  customNotes: Record<string, string>,
): Promise<Blob> {
  const generatedDate = new Date().toISOString().slice(0, 10);
  const doc = (
    <GddPdfDocument
      gameName={gameName}
      audience={audience}
      sections={sections}
      customNotes={customNotes}
      generatedDate={generatedDate}
    />
  );
  return await pdf(doc).toBlob();
}
