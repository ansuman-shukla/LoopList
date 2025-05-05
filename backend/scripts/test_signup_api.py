import requests
import json

def test_signup():
    url = "http://localhost:8000/api/v1/auth/signup"
    headers = {"Content-Type": "application/json"}
    data = {
        "email": "test5@example.com",
        "username": "testuser5",
        "password": "testpassword"
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")

        if response.status_code == 200:
            print("Signup successful!")
            return True
        else:
            print("Signup failed.")
            return False
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_signup()
