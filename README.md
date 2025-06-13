# CashClip

CashClip is a Django-based RESTful API service that provides a social blogging platform where users can create accounts, publish blog posts, like posts, and comment on them.

## Features

- **User Authentication**: Secure user authentication using JWT tokens with refresh token capabilities
- **Blog Management**: Create, read, update, and delete blog posts
- **Social Interactions**: Like and comment on blog posts
- **API Documentation**: Interactive API documentation using Swagger/ReDoc
- **Docker Support**: Easy deployment using Docker

## Tech Stack

- **Backend**: Django 5.2, Django REST Framework
- **Authentication**: Django REST Framework SimpleJWT
- **Documentation**: drf-yasg (Swagger/ReDoc)
- **Admin Interface**: Django Jazzmin (Customized admin panel)
- **Database**: SQLite (development), can be configured for PostgreSQL
- **Containerization**: Docker

## API Endpoints

The API provides the following endpoints:

- `/api/user/` - User registration and management
- `/api/user/login/` - User authentication and token generation
- `/api/user/logout/` - User logout (token blacklisting)
- `/api/blog/` - Blog post CRUD operations
- `/api/blog/{id}/likes/` - View likes for a specific blog post
- `/api/blog/{id}/like/` - Like or unlike a blog post
- `/api/blog/{id}/comments/` - View comments for a specific blog post
- `/api/comment/` - Comment CRUD operations
- `/swagger/` - API documentation with Swagger UI
- `/redoc/` - API documentation with ReDoc UI

## Installation and Setup

### Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- Optional: Docker and Docker Compose

### Local Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd CashClip
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run migrations:
   ```bash
   python manage.py migrate
   ```

5. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```

6. Start the development server:
   ```bash
   python manage.py runserver
   ```

7. Access the application:
   - API: http://127.0.0.1:8000/api/
   - Admin panel: http://127.0.0.1:8000/admin/
   - API Documentation: http://127.0.0.1:8000/swagger/ or http://127.0.0.1:8000/redoc/

### Docker Setup

1. Build and run the Docker container:
   ```bash
   docker build -t cashclip .
   docker run -p 8000:8000 cashclip
   ```

2. Access the application at the same URLs as in the local setup.

## Project Structure

```
CashClip/
├── db.sqlite3                # SQLite database
├── Dockerfile                # Docker configuration
├── learn/                    # Main Django project folder
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py           # Project settings
│   ├── urls.py               # Main URL configuration
│   └── wsgi.py
├── manage.py                 # Django management script
├── register/                 # Main application
│   ├── __init__.py
│   ├── admin.py              # Admin configuration
│   ├── apps.py               # App configuration
│   ├── models.py             # Database models
│   ├── routes.py             # API routes
│   ├── serializers.py        # API serializers
│   ├── tests.py              # Test cases
│   ├── urls.py               # URL patterns
│   └── views.py              # API views
└── requirements.txt          # Python dependencies
```

## Models

- **CustomUser**: Extended user model with additional phone field
- **Blog**: Blog post model with title, description, author, publish date, and image
- **Like**: Model to track user likes on blog posts
- **Comment**: Model for user comments on blog posts

## API Authentication

The API uses JWT (JSON Web Token) authentication. To access protected endpoints:

1. Obtain tokens by sending a POST request to `/api/user/login/` with username and password
2. Use the access token in the Authorization header for subsequent requests: `Bearer <access_token>`
3. When the access token expires, use the refresh token to get a new one

## Development

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Feel free to make any contributions to this project.
