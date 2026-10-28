import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bookingGuides, type BookingGuideKind } from './bookingGuideContent';

type Props = { kind: BookingGuideKind; primary?: string };
export default function BookingUserGuide({ kind, primary = '#780C60' }: Props) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const guide = bookingGuides[kind];
  const close = () => setVisible(false);
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${guide.title}`} onPress={() => { setExpanded(guide.sections[0].id); setVisible(true); }} style={styles.launch}>
      <View style={[styles.launchIcon, { backgroundColor: primary }]}><Ionicons name="book-outline" size={20} color="#FFFFFF" /></View>
      <View style={styles.launchCopy}><Text style={[styles.launchTitle, { color: primary }]}>User Guide</Text><Text style={styles.launchHint}>Booking steps, payments &amp; available actions</Text></View>
      <Ionicons name="chevron-forward" size={18} color={primary} />
    </TouchableOpacity>
    {visible && <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View accessibilityViewIsModal style={[styles.panel, { maxHeight: Math.max(180, height - insets.top - Math.max(insets.bottom, 12) - 24) }]}>
          <View style={[styles.header, { backgroundColor: primary }]}>
            <View style={styles.headingCopy}><Text style={styles.eyebrow}>EVENTIFY HUB · HELP</Text><Text accessibilityRole="header" style={styles.heading}>{guide.title}</Text></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close user guide" onPress={close} style={styles.close}><Ionicons name="close" size={23} color="#FFFFFF" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.content}>
            <Text style={styles.introduction}>{guide.introduction}</Text>
            <View style={styles.quickBox}>
              <Text style={[styles.quickTitle, { color: primary }]}>Your quick path</Text>
              {guide.quickSteps.map((step, index) => <View key={step} style={styles.step}><Text style={[styles.number, { color: primary }]}>{index + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}
            </View>
            <Text style={styles.topicHint}>Tap a topic to read its steps.</Text>
            {guide.sections.map(section => {
              const open = expanded === section.id;
              return <View key={section.id} style={styles.section}>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setExpanded(open ? null : section.id)} style={styles.topic}>
                  <View style={styles.topicCopy}><Text style={[styles.topicTitle, { color: primary }]}>{section.title}</Text><Text style={styles.topicSummary}>{section.summary}</Text></View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={19} color={primary} />
                </TouchableOpacity>
                {open && <View style={styles.body}>
                  {section.steps.map((step, index) => <View key={step} style={styles.step}><Text style={[styles.number, { color: primary }]}>{index + 1}</Text><Text selectable style={styles.stepText}>{step}</Text></View>)}
                  {!!section.note && <View style={styles.note}><Ionicons name="information-circle-outline" size={18} color={primary} /><Text selectable style={styles.noteText}>{section.note}</Text></View>}
                </View>}
              </View>;
            })}
            <Text style={styles.footer}>Use the exact status, deadline and timezone shown on your booking. Examples in this guide are illustrations, not new deadlines.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </>;
}
const styles = StyleSheet.create({
  launch: { flexDirection: 'row', alignItems: 'center', gap: 11, marginHorizontal: 18, marginVertical: 10, padding: 12, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: '#EBD7E4', backgroundColor: '#FFFFFF' },
  launchIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, launchCopy: { flex: 1 }, launchTitle: { fontSize: 15, fontWeight: '800' }, launchHint: { fontSize: 12, lineHeight: 18, color: '#765D70', marginTop: 2 },
  overlay: { flex: 1, backgroundColor: 'rgba(34,15,29,0.48)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  panel: { width: '100%', maxWidth: 760, flexShrink: 1, backgroundColor: '#FBF5F9', borderRadius: 22, overflow: 'hidden' }, header: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 }, headingCopy: { flex: 1 }, eyebrow: { fontSize: 10, letterSpacing: 1, color: '#F4DAEC', fontWeight: '700' }, heading: { fontSize: 20, lineHeight: 28, fontWeight: '800', color: '#FFFFFF', marginTop: 5 },
  close: { minWidth: 44, minHeight: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 24 }, introduction: { fontSize: 14, lineHeight: 22, color: '#594450', marginBottom: 16 }, quickBox: { backgroundColor: '#F4E6F0', padding: 14, borderRadius: 15, gap: 10 }, quickTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  topicHint: { fontSize: 12, color: '#765D70', marginVertical: 15 }, section: { borderWidth: 1, borderColor: '#ECDDE7', borderRadius: 15, backgroundColor: '#FFFFFF', marginBottom: 10, overflow: 'hidden' }, topic: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }, topicCopy: { flex: 1 }, topicTitle: { fontSize: 15, lineHeight: 21, fontWeight: '700' }, topicSummary: { fontSize: 12, lineHeight: 18, color: '#765D70', marginTop: 4 }, body: { paddingHorizontal: 14, paddingBottom: 16, gap: 14 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, number: { width: 22, fontSize: 13, lineHeight: 22, fontWeight: '800' }, stepText: { flex: 1, fontSize: 14, lineHeight: 22, color: '#3E303A' }, note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FAF0F7', padding: 12, borderRadius: 11 }, noteText: { flex: 1, fontSize: 12, lineHeight: 19, color: '#67465C' }, footer: { fontSize: 12, lineHeight: 19, color: '#765D70', paddingHorizontal: 4, paddingTop: 8 },
});
