from django.contrib import admin
from .models import CustomUser, Blog, Like, Comment

admin.site.register(CustomUser) 
admin.site.register(Blog)
admin.site.register(Like)
admin.site.register(Comment)