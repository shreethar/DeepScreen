import json
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-mpnet-base-v2")

file_path = "portfolio_output.json"

try:
    with open(file_path, 'r') as file:
        data_dict = json.load(file)
    
    # print("Successfully loaded JSON data as a dictionary:")
    # print(data_dict)
    # print(f"Type of data_dict: {type(data_dict)}")

except FileNotFoundError:
    print(f"Error: The file '{file_path}' was not found.")
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from the file '{file_path}'. Check file format.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

print(data_dict['projects'][3])

portfolio_embedding = model.encode(str(data_dict['projects'][3]))

resume_output = """
a.Used EfficientAD to detect visual anomalies within an image, including segmentation using PyTorch
"""
resume_embedding = model.encode(resume_output)

similarities = model.similarity(portfolio_embedding, resume_embedding)
print(similarities)