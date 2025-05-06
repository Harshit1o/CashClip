from django.urls import path, include
from .routes import urlpatterns as router_urls
from . import views

urlpatterns = [
    path('', include(router_urls)),  # includes all API routes
]
