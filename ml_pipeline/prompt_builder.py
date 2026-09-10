# ml_pipeline/prompt_builder.py
from ml_pipeline.scoring_ai import calculate_scores

def build_prompt(audio_results, video_results, nlp_results, avg_past_score=None):
        scores = calculate_scores(audio_results, video_results, nlp_results)

        wpm = audio_results.get("wpm", 0)
        fillers = audio_results.get("fillers", 0)
        fillers_per_min = audio_results.get("fillers_per_minute", 0.0)
    
        total_pauses = audio_results.get("num_pauses", 0)
        avg_pause = audio_results.get("avg_pause_sec", 0.0)
        total_pause_time = audio_results.get("total_pause_sec", 0.0)
    
        mean_pitch = audio_results.get("mean_pitch_hz", 0.0)
        pitch_variation = audio_results.get("pitch_variation_hz", 0.0)
    
        transcript = audio_results.get("transcript", "")
    
        # ==========================
        # VIDEO VARIABLES
        # ==========================
        eye_contact = video_results.get("eye_contact_pct", 0)
    
        dominant_head = video_results.get(
            "head_pose_dominant",
            "Unknown"
        )
    
        head_pose_forward = video_results.get(
            "head_pose_forward_pct",
            0
        )
    
        dominant_posture = video_results.get(
            "posture_dominant",
            "Unknown"
        )
    
        upright_posture = video_results.get(
            "posture_upright_pct",
            0
        )
    
        smile_pct = video_results.get(
            "smile_pct",
            0
        )
    
        gestures = video_results.get(
            "gesture_active_pct",
            0
        )
    
        # ==========================
        # NLP VARIABLES
        # ==========================
        readability = nlp_results.get(
            "readability",
            "Unknown"
        )
    
        grade_level = nlp_results.get(
            "grade_level",
            "N/A"
        )
    
        reading_ease = nlp_results.get(
            "reading_ease",
            0.0
        )
    
        ttr = nlp_results.get(
            "vocabulary_ttr",
            0.0
        )
    
        coherence_score = nlp_results.get(
            "coherence_score",
            0.0
        )
    
        sentences = nlp_results.get(
            "sentences",
            0
        )
    
        avg_sentence_length = nlp_results.get(
            "avg_sentence_length",
            0.0
        )
    
        # ==========================
        # PROMPT
        # ==========================
        prompt = f"""
    You are an expert English Communication Coach, Public Speaking Trainer, and Grammar Evaluator.
    
    Your task is to evaluate the student's spoken English performance using:
    
    1. Audio metrics
    2. Video metrics
    3. NLP metrics
    4. Transcript
    
    IMPORTANT RULES:
    
    - Evaluate ALL areas equally.
    - Do NOT over-focus on pauses.
    - Use transcript to detect grammar mistakes.
    - Use transcript to evaluate vocabulary and communication quality.
    - Ignore normal speech hesitations like "um", "uh", and self-corrections unless they create genuine grammar errors.
    - If grammar mistakes exist, provide corrected versions.
    - Areas for Polish MUST identify the TWO weakest dimensions based on the provided Calculated Scores.
    - The two weaknesses should come from different categories whenever possible.
    - Tomorrow's Action Plan MUST directly address the weaknesses identified.
    - Do not simply repeat the metrics.
    - Explain why the metrics matter.
    - If Historical Average Score is provided, briefly comment on whether their current Overall Performance is improving or declining compared to their historical average.
    
    ====================================================
    HISTORICAL CONTEXT
    ====================================================
    User's Average Score from all past sessions: {avg_past_score if avg_past_score is not None else "First session (no history yet)"}

    ====================================================
    CALCULATED SCORES (DO NOT INVENT THESE, USE EXACTLY AS GIVEN)
    ====================================================
    
    Confidence: {scores['Confidence']}/100
    Fluency: {scores['Fluency']}/100
    English Proficiency: {scores['English Proficiency']}/100
    Communication Impact: {scores['Communication Impact']}/100
    Vocal Engagement: {scores['Vocal Engagement']}/100
    Physical Presence: {scores['Physical Presence']}/100
    Overall Performance: {scores['Overall Performance']}/100
    
    
    Evaluation Weight:
    
    Audio = 30%
    Video = 25%
    Grammar & English = 25%
    Communication & Content = 20%
    
    ====================================================
    AUDIO METRICS
    ====================================================
    
    Speaking Pace: {wpm} WPM
    
    Filler Words: {fillers}
    
    Fillers Per Minute: {fillers_per_min}
    
    Total Pauses: {total_pauses}
    
    Average Pause Duration: {avg_pause}
    
    Total Pause Time: {total_pause_time}
    
    Mean Pitch: {mean_pitch}
    
    Pitch Variation: {pitch_variation}
    
    ====================================================
    VIDEO METRICS
    ====================================================
    
    Eye Contact: {eye_contact}%
    
    Head Pose Dominant: {dominant_head}
    
    Forward Head Percentage: {head_pose_forward}%
    
    Posture Dominant: {dominant_posture}
    
    Upright Posture Percentage: {upright_posture}%
    
    Hand Gesture Activity: {gestures}%
    
    Smile Frequency: {smile_pct}%
    
    ====================================================
    NLP METRICS
    ====================================================
    
    Readability: {readability}
    
    Grade Level: {grade_level}
    
    Reading Ease: {reading_ease}
    
    Vocabulary Richness (TTR): {ttr}
    
    Coherence Score: {coherence_score}
    
    Total Sentences: {sentences}
    
    Average Sentence Length: {avg_sentence_length}
    
    ====================================================
    TRANSCRIPT
    ====================================================
    
    {transcript}
    
    ====================================================
    OUTPUT FORMAT
    ====================================================
    
    # 💯 Performance Scores
    
    Confidence: {scores['Confidence']}/100
    
    Fluency: {scores['Fluency']}/100
    
    English Proficiency: {scores['English Proficiency']}/100
    
    Communication Impact: {scores['Communication Impact']}/100
    
    Vocal Engagement: {scores['Vocal Engagement']}/100
    
    Physical Presence: {scores['Physical Presence']}/100
    
    Overall Performance: {scores['Overall Performance']}/100
    
    Performance Level:
    (Beginner / Elementary / Intermediate / Upper Intermediate / Advanced / Interview Ready)
    
    ----------------------------------------------------
    
    # 📊 Executive Assessment
    
    Provide 2-3 paragraphs.
    
    Discuss:
    
    - Confidence
    - Fluency
    - Communication
    - Body Language
    - Grammar
    - Speaking Style
    
    Interpret metrics instead of repeating them.
    
    ----------------------------------------------------
    
    # ✅ Grammar Review
    
    Grammar Errors Found: X
    
    For each grammar mistake provide:
    
    ❌ Original
    
    ✅ Correct
    
    📚 Rule Violated
    
    💡 Explanation
    
    Maximum 5 mistakes.
    
    If no mistakes exist, explicitly say:
    
    "No significant grammar mistakes detected."
    
    ----------------------------------------------------
    
    # 🌟 Core Strengths
    
    Provide exactly TWO strengths.
    
    For each:
    
    - Metric evidence
    - Why it helps communication
    - Impact on listener
    
    ----------------------------------------------------
    
    # 📈 Areas for Polish
    
    Provide exactly TWO weaknesses.
    
    Choose the weakest dimensions.
    
    Do NOT choose pauses repeatedly unless pause metrics are genuinely poor.
    
    Explain:
    
    - Why it is a weakness
    - Evidence from metrics
    - Impact on audience
    
    ----------------------------------------------------
    
    # 🎯 Tomorrow's Action Plan
    
    Provide EXACTLY TWO exercises.
    
    For each exercise:
    
    Exercise Name:
    
    Duration:
    
    Steps:
    
    Target Metric:
    
    Expected Improvement:
    
    ----------------------------------------------------
    
    # ⭐ Final Coach's Advice
    
    Provide one motivating paragraph.
    
    Mention the single most important improvement area for tomorrow.
    """
        return prompt