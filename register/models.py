from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    phone = models.CharField(max_length=15, unique=True)

    class Meta:
        # This explicitly sets the db_table name and the verbose_name
        db_table = 'register_customuser'
        verbose_name = 'customuser'
        verbose_name_plural = 'customusers'

    def __str__(self):
        return self.username
    
class Blog(models.Model):
    title = models.CharField(max_length=50)
    description = models.CharField(max_length=200)
    author = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    publish_date = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to='blog_images/', blank=True,null=True)

    def __str__(self):
        return self.title

class Like(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    post = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='likes')
    time = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'post')
    def __str__(self):
        return f"{self.user.username} likes {self.post.title}"

class Comment(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    post = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='comments')
    comment = models.CharField(max_length=100)
    time = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} : {self.comment[:20]}"