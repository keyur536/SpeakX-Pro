import streamlit as st
import tempfile
import os
from services.audio_ai import analyze_audio
from services.video_ai import analyze_video
from services.nlp_ai import analyze_nlp
from services.llm_ai import generate_feedback

# Configure the page
st.set_page_config(page_title="SpeakX-Pro", page_icon="🎥", layout="wide")

# --- Custom CSS for better visuals ---
st.markdown("""
<style>
    .metric-card {
        background: #1e1e2e;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #313244;
        margin-bottom: 8px;
    }
    .section-header {
        font-size: 1.3rem;
        font-weight: 700;
        margin-bottom: 12px;
        padding: 8px 0;
        border-bottom: 2px solid #313244;
    }
    .coach-feedback-box {
        background-color: #1e293b;
        border-left: 5px solid #3b82f6;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
    }
</style>
""", unsafe_allow_html=True)

st.title("🎥 SpeakX-Pro")
st.markdown("Upload your daily 5-minute video to get an automated feedback report on your **English fluency** and **confidence**.")

uploaded_file = st.file_uploader("Upload your daily video", type=["mp4", "mov", "avi"])

if uploaded_file is not None:
    # Wrap the video in columns to fix its width and center it
    vid_col1, vid_col2, vid_col3 = st.columns([1, 1, 1])
    with vid_col2:
        st.video(uploaded_file)

    if st.button("🚀 Analyze Video & Generate Report", type="primary", use_container_width=True):

        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
            temp_video.write(uploaded_file.read())
            temp_video_path = temp_video.name

        # --- PHASE 1: AUDIO ---
        with st.spinner("🎙️ Analyzing audio — transcribing, measuring pace and pauses..."):
            try:
                audio_results = analyze_audio(temp_video_path)
            except Exception as e:
                st.error(f"Audio Error: {e}")
                audio_results = {"transcript": "Error", "wpm": 0, "fillers": 0}

        # --- PHASE 2: NLP ---
        with st.spinner("🧠 Running NLP analysis — grammar, vocabulary, readability..."):
            try:
                nlp_results = analyze_nlp(audio_results.get("transcript", ""))
            except Exception as e:
                st.error(f"NLP Error: {e}")
                nlp_results = {}

        # --- PHASE 3: VIDEO ---
        with st.spinner("🎥 Analyzing video — eye contact, posture, smiles, gestures..."):
            try:
                video_results = analyze_video(temp_video_path)
            except Exception as e:
                st.error(f"Video Error: {e}")
                video_results = {"eye_contact_pct": 0, "posture_dominant": "Unknown"}

        # --- PHASE 4: LLM FEEDBACK ---
        with st.spinner("🤖 AI Coach is writing your personalized feedback report..."):
            feedback_report = generate_feedback(audio_results, video_results, nlp_results)

        os.remove(temp_video_path)
        st.success("✅ Full Analysis & Report Complete!")
        st.divider()

        # =============================================================
        # DISPLAY RESULTS
        # =============================================================

        # --- LLM COACHING REPORT (TOP) ---
        st.markdown("## 🤖 Your AI Coach's Feedback")
        st.markdown(f'<div class="coach-feedback-box">{feedback_report}</div>', unsafe_allow_html=True)

        st.divider()

        # --- AUDIO ANALYSIS ---
        st.markdown("## 🎙️ Audio Analysis")
        a1, a2, a3, a4 = st.columns(4)
        a1.metric("Speaking Pace", f"{audio_results.get('wpm', 0)} wpm")
        a2.metric("Filler Words", audio_results.get('fillers', 0))
        a3.metric("Fillers / Min", audio_results.get('fillers_per_minute', 0))
        a4.metric("Total Pauses", audio_results.get('num_pauses', 0))

        b1, b2, b3, b4 = st.columns(4)
        b1.metric("Mean Pitch", f"{audio_results.get('mean_pitch_hz', 0)} Hz")
        b2.metric("Pitch Variation", f"{audio_results.get('pitch_variation_hz', 0)} Hz")
        b3.metric("Avg Pause", f"{audio_results.get('avg_pause_sec', 0)}s")
        b4.metric("Total Pause Time", f"{audio_results.get('total_pause_sec', 0)}s")

        # Audio Detailed Report Dropdown
        with st.expander("📋 Detailed Audio Report"):
            st.markdown("#### 🗣️ Filler Word Breakdown")
            filler_breakdown = audio_results.get("filler_breakdown", {})
            if filler_breakdown:
                for word, count in sorted(filler_breakdown.items(), key=lambda x: x[1], reverse=True):
                    st.markdown(f"- **\"{word}\"** — used **{count}** time(s)")
            else:
                st.success("✅ No filler words detected!")

            st.markdown("#### ⏸️ Pause Analysis")
            num_pauses = audio_results.get("num_pauses", 0)
            avg_pause = audio_results.get("avg_pause_sec", 0)
            total_pause = audio_results.get("total_pause_sec", 0)
            duration = audio_results.get("duration_sec", 1)
            pause_pct = round((total_pause / duration) * 100, 1) if duration > 0 else 0
            st.markdown(f"- Total pauses detected: **{num_pauses}**")
            st.markdown(f"- Average pause duration: **{avg_pause}s**")
            st.markdown(f"- Total silence time: **{total_pause}s** ({pause_pct}% of video)")

            st.markdown("#### 🎵 Vocal Pitch Analysis")
            mean_pitch = audio_results.get("mean_pitch_hz", 0)
            pitch_var = audio_results.get("pitch_variation_hz", 0)
            pitch_label = "Monotone (try to vary your pitch more!)" if pitch_var < 30 else "Dynamic (great vocal variety!)"
            st.markdown(f"- Mean Pitch: **{mean_pitch} Hz**")
            st.markdown(f"- Pitch Variation: **{pitch_var} Hz** — {pitch_label}")

        st.divider()

        # --- VIDEO ANALYSIS ---
        st.markdown("## 🎥 Video Analysis")
        v1, v2, v3, v4 = st.columns(4)
        v1.metric("Eye Contact", f"{video_results.get('eye_contact_pct', 0)}%")
        v2.metric("Head Pose (Forward)", f"{video_results.get('head_pose_forward_pct', 0)}%")
        v3.metric("Smiling", f"{video_results.get('smile_pct', 0)}%")
        v4.metric("Hand Gestures", f"{video_results.get('gesture_active_pct', 0)}%")

        v5, v6, v7, v8 = st.columns(4)
        v5.metric("Upright Posture", f"{video_results.get('upright_pct', 0)}%")
        v6.metric("Dominant Posture", video_results.get('posture_dominant', 'N/A'))
        v7.metric("Dominant Head", video_results.get('head_pose_dominant', 'N/A'))
        v8.metric("Frames Sampled", video_results.get('frames_sampled', 0))
        st.divider()

        # --- NLP ANALYSIS ---
        st.markdown("## 🧠 NLP Analysis")
        n1, n2, n3, n4 = st.columns(4)

        grammar_val = nlp_results.get('grammar_errors', -1)
        n1.metric("Grammar Errors", grammar_val if grammar_val >= 0 else "N/A")
        n2.metric("Vocab Richness (TTR)", f"{nlp_results.get('vocabulary_ttr', 0):.2f}")
        n3.metric("Coherence Score", f"{nlp_results.get('coherence_score', 0):.2f}")
        n4.metric("Readability", nlp_results.get('readability', 'N/A'))

        n5, n6, n7, n8 = st.columns(4)
        n5.metric("Sentences", nlp_results.get('sentence_count', 0))
        n6.metric("Avg Sentence Length", f"{nlp_results.get('avg_sentence_length', 0)} words")
        n7.metric("Reading Ease", nlp_results.get('flesch_reading_ease', 0))
        n8.metric("Grade Level", f"Grade {nlp_results.get('flesch_kincaid_grade', 0)}")

        # NLP Detailed Report Dropdown
        with st.expander("📋 Detailed NLP Report"):
            st.markdown("#### ❌ Grammar Error Details")
            grammar_detail = nlp_results.get("grammar_errors_detail", [])
            grammar_issues = nlp_results.get("grammar_top_issues", [])
            if grammar_val == -1:
                st.warning("⚠️ Grammar check was unavailable. Make sure LanguageTool is installed.")
            elif grammar_val == 0:
                st.success("✅ No grammar errors found! Excellent English!")
            else:
                if grammar_issues:
                    st.markdown(f"**Top Error Categories:** {', '.join(grammar_issues)}")
                for i, err in enumerate(grammar_detail, 1):
                    with st.container():
                        st.markdown(f"**Error {i}:** {err.get('message', '')}")
                        st.markdown(f"&nbsp;&nbsp;📍 Context: *\"{err.get('context', '')}\"*")
                        suggestions = err.get("suggestions", [])
                        if suggestions:
                            st.markdown(f"&nbsp;&nbsp;💡 Suggestions: **{', '.join(suggestions)}**")
                        st.markdown("---")

            st.markdown("#### 📚 Vocabulary Analysis")
            ttr = nlp_results.get("vocabulary_ttr", 0)
            unique = nlp_results.get("unique_words", 0)
            total_w = nlp_results.get("total_words", 0)
            ttr_label = "Rich & Diverse" if ttr >= 0.5 else ("Average" if ttr >= 0.35 else "Repetitive (try using more varied words)")
            st.markdown(f"- Total Words Spoken: **{total_w}**")
            st.markdown(f"- Unique Words Used: **{unique}**")
            st.markdown(f"- Vocabulary Richness (TTR): **{ttr}** — {ttr_label}")

            st.markdown("#### 📖 Readability Breakdown")
            flesch = nlp_results.get("flesch_reading_ease", 0)
            grade = nlp_results.get("flesch_kincaid_grade", 0)
            readability = nlp_results.get("readability", "N/A")
            st.markdown(f"- Flesch Reading Ease Score: **{flesch}** (100 = very easy, 0 = very hard)")
            st.markdown(f"- Readability Label: **{readability}**")
            st.markdown(f"- Grade Level: **Grade {grade}** (audience who can easily understand you)")
            coherence = nlp_results.get("coherence_score", 0)
            coherence_label = "Highly Coherent" if coherence >= 0.3 else ("Moderate" if coherence >= 0.15 else "Low — try linking your sentences with connecting words")
            st.markdown(f"- Coherence Score: **{coherence}** — {coherence_label}")

        st.divider()

        # --- TRANSCRIPT ---
        with st.expander("📝 Full Transcript"):
            st.write(audio_results.get('transcript', 'No transcript available.'))