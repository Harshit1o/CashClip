from django.shortcuts import render, redirect
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, login, logout
from .models import CustomUser, Blog, Like, Comment
from rest_framework.decorators import action
from rest_framework import viewsets
from .serializers import UserSerializer, BlogSerializer, LikeSerializer, CommentSerializer
from django.contrib import messages
from django.contrib.auth.decorators import login_required

class UserViews(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer   
    
    def get_permissions(self):
        if self.action in ['create', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user.id,
                'username': user.username
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()  # requires blacklisting enabled
            return Response({'message': 'Logged out successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class BlogViews(viewsets.ModelViewSet):
    queryset = Blog.objects.all()
    serializer_class = BlogSerializer
    
    def get_permissions(self):
        if self.action == 'list' or self.action == 'retrieve':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
    
    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        blog = self.get_object()
        comments = Comment.objects.filter(post=blog)
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def likes(self, request, pk=None):
        blog = self.get_object()
        likes = Like.objects.filter(post=blog)
        serializer = LikeSerializer(likes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        blog = self.get_object()
        user = request.user
        
        # Check if user already liked this post
        like_exists = Like.objects.filter(user=user, post=blog).exists()
        
        if like_exists:
            # Unlike if already liked
            Like.objects.filter(user=user, post=blog).delete()
            return Response({'message': 'Like removed'}, status=status.HTTP_200_OK)
        else:
            # Create new like
            Like.objects.create(user=user, post=blog)
            return Response({'message': 'Post liked'}, status=status.HTTP_201_CREATED)

class CommentViews(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    # Only allow users to update/delete their own comments
    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class LikeViews(viewsets.ModelViewSet):
    queryset = Like.objects.all()
    serializer_class = LikeSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    # Prevent duplicate likes
    def create(self, request, *args, **kwargs):
        user = request.user
        post_id = request.data.get('post')
        
        like_exists = Like.objects.filter(user=user, post_id=post_id).exists()
        
        if like_exists:
            return Response(
                {'error': 'You have already liked this post'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().create(request, *args, **kwargs)