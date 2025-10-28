import requests
import json
import time

BASE_URL = "http://localhost:8000"

def wait_for_server(timeout=30):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            requests.get(BASE_URL)
            return True
        except requests.ConnectionError:
            time.sleep(1)
    return False

def test_root():
    response = requests.get(f"{BASE_URL}/")
    print("Root endpoint response:", response.json())

def test_create_problem():
    # Example optimization problem (based on cookie optimizer)
    problem_data = {
        "name": "Cookie Recipe Optimization",
        "description": "Optimize cookie recipe for best taste and nutrition",
        "variables": [
            {
                "name": "flour",
                "min": 100,
                "max": 300,
                "unit": "grams"
            },
            {
                "name": "sugar",
                "min": 50,
                "max": 150,
                "unit": "grams"
            }
        ],
        "objective_function": "maximize taste while maintaining nutrition",
        "constraints": [
            "total weight <= 500g",
            "sugar content <= 30%"
        ]
    }
    
    response = requests.post(f"{BASE_URL}/optimization/problems/", json=problem_data)
    print("\nCreate problem response:", json.dumps(response.json(), indent=2))
    return response.json().get("id")

def test_list_problems():
    response = requests.get(f"{BASE_URL}/optimization/problems/")
    print("\nList problems response:", json.dumps(response.json(), indent=2))

def test_execute_optimization(problem_id):
    config_data = {
        "problem_id": problem_id,
        "population_size": 30,
        "max_iterations": 50,
        "convergence_threshold": 0.001
    }
    
    response = requests.post(f"{BASE_URL}/optimization/execute/", json=config_data)
    print("\nExecute optimization response:", json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("Waiting for server to be ready...")
    if not wait_for_server():
        print("Server did not respond in time")
        exit(1)
        
    print("Testing API endpoints...")
    
    # Create and test optimization problem
    problem_id = test_create_problem()
    
    # List all problems
    test_list_problems()
    
    # Execute optimization
    if problem_id:
        test_execute_optimization(problem_id)