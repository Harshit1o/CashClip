#these are the routes
from rest_framework.routers import DefaultRouter
from .views import UserViews, BlogViews, CommentViews, LikeViews

router = DefaultRouter()
router.register('user', UserViews, basename='user')
router.register('blog', BlogViews, basename='blog')
router.register('comment', CommentViews, basename='comment')
router.register('like', LikeViews, basename='like')
urlpatterns = router.urls
