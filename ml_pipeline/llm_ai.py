# # ----- ollama -----------------------------------------------------------------------------

import requests
from ml_pipeline.prompt_builder import build_prompt

def generate_feedback(audio_results, video_results, nlp_results, avg_past_score=None):
    
    # Build the prompt from the dedicated file
    prompt = build_prompt(audio_results, video_results, nlp_results, avg_past_score)

    # Send to Ollama
    url = "http://localhost:11434/api/generate"
    payload = {"model": "Qwen2.5:7b-instruct", 
               "prompt": prompt, 
               "stream": False
               }
    response = requests.post(url, json=payload, timeout=2000)
    return response.json().get("response", "Error")

# ----- ChatGPT ------------------------------------------------------------------------------------------------------

# services/llm_ai.py

# from openai import OpenAI
# from services.prompt_builder import build_prompt
# import os
# from dotenv import load_dotenv
# load_dotenv() 

# def generate_feedback(audio_results, video_results, nlp_results):
#     prompt = build_prompt(audio_results, video_results, nlp_results)

#     client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

#     response = client.chat.completions.create(
#         model="gpt-4o",           # or "gpt-3.5-turbo"
#         messages=[
#             {"role": "user", "content": prompt}
#         ],
#         temperature=0.4
#     )
#     return response.choices[0].message.content

# ----- Huggingface ------------------------------------------------------------------------------------------------------

# from huggingface_hub import InferenceClient
# from services.prompt_builder import build_prompt
# import os
# from dotenv import load_dotenv
# load_dotenv() 
# 
# def generate_feedback(audio_results, video_results, nlp_results):
#     prompt = build_prompt(audio_results, video_results, nlp_results)
# 
#     client = InferenceClient(
#         model="mistralai/Mistral-7B-Instruct-v0.3",
#         # model = "poolside/Laguna-S-2.1",  # any HF model
#         token=os.environ.get("HF_TOKEN")
#     )
# 
#     response = client.text_generation(prompt)
#     return response

def ask_rag_coach(query: str, context: str) -> str:
    """
    Asks the AI coach a specific question using past session data as context.
    """
    prompt = f"You are a strict but supportive public speaking coach.\n\nContext of the user's past performances:\n{context}\n\nUser Question: {query}\n\nAnswer the user directly based on their past context."
    
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "Qwen2.5:7b-instruct",
        "prompt": prompt,
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=180)
        if response.status_code == 200:
            return response.json().get("response", "No response generated.")
        else:
            print(f"Ollama RAG Error: Status {response.status_code} - {response.text}")
    except requests.exceptions.Timeout:
        print("Ollama RAG Error: Request timed out after 180 seconds.")
    except requests.exceptions.ConnectionError:
        print("Ollama RAG Error: Cannot connect to Ollama at http://localhost:11434 — is it running?")
    except Exception as e:
        print(f"Ollama RAG Error: {e}")
        
    return "I am unable to answer right now. Please ensure the AI engine is running."