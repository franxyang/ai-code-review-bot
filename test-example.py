"""
Test file with intentional code issues for AI review demo
"""
import os
import requests

# SECURITY ISSUE: Hardcoded credentials
API_KEY = "sk-1234567890abcdefghijklmnopqrstuvwxyz"
DB_PASSWORD = "admin123"
SECRET_TOKEN = "secret-token-here"

class UserService:
    def __init__(self):
        self.db_url = "postgresql://admin:password@localhost/users"
    
    # SECURITY: SQL Injection vulnerability
    def get_user_by_id(self, user_id):
        query = f"SELECT * FROM users WHERE id = {user_id}"
        return self.execute_query(query)
    
    # SECURITY: SQL Injection
    def search_users(self, name):
        query = f"SELECT * FROM users WHERE name LIKE '%{name}%'"
        return self.execute_query(query)
    
    # PERFORMANCE: N+1 query problem
    def get_users_with_posts(self):
        users = self.get_all_users()
        result = []
        for user in users:
            # Individual query for each user - inefficient!
            posts = self.get_posts_for_user(user['id'])
            user['posts'] = posts
            result.append(user)
        return result
    
    # BUG: No error handling
    def fetch_external_data(self, url):
        response = requests.get(url)
        return response.json()
    
    # PERFORMANCE: Inefficient loop
    def process_data(self, items):
        result = []
        for item in items:
            for i in range(len(item)):
                for j in range(len(item[i])):
                    result.append(item[i][j])
        return result
    
    # MAINTAINABILITY: Poor naming and no docstring
    def x(self, a, b, c):
        return a + b * c if c > 0 else a - b
    
    # STYLE: Inconsistent formatting
    def badly_formatted(self,x,y,z):
        if x>0:
            return y+z
        else:
            return y-z
    
    # Helper methods (not implemented)
    def execute_query(self, query):
        pass
    
    def get_all_users(self):
        return []
    
    def get_posts_for_user(self, user_id):
        return []

# GOOD: Well-documented function with type hints
def calculate_discount(price: float, discount_percent: float) -> float:
    """
    Calculate the final price after applying discount.
    
    Args:
        price: Original price
        discount_percent: Discount percentage (0-100)
        
    Returns:
        Final price after discount
        
    Raises:
        ValueError: If discount is not in valid range
    """
    if not 0 <= discount_percent <= 100:
        raise ValueError("Discount must be between 0 and 100")
    
    discount_amount = price * (discount_percent / 100)
    return price - discount_amount

# GOOD: Proper error handling
def safe_divide(a: float, b: float) -> float:
    """Safely divide two numbers."""
    try:
        return a / b
    except ZeroDivisionError:
        return 0.0
    except TypeError as e:
        raise ValueError(f"Invalid input types: {e}")
