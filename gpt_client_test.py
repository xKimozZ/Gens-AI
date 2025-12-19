import os 
import sys
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), 
                base_url="https://api.githubcopilot.com"
                )

messages = [
    {"role" : "system", "content": "You are a helpful assistant."},
    {"role" : "user", "content": "Hello, how are you?"}
]

response = client.chat.completions.create( 
    model="gpt-5-mini",
    messages=messages
)

print(response.choices[0].message.content)


if __name__ == "__main__":
    pass