/*
Navicat MySQL Data Transfer

Source Server         : localhost
Source Server Version : 50505
Source Host           : localhost:3306
Source Database       : fishing

Target Server Type    : MYSQL
Target Server Version : 50505
File Encoding         : 65001

Date: 2026-06-12 17:37:08
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for `comments`
-- ----------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_259bf9825d9d198608d1b46b0b5` (`post_id`),
  KEY `FK_4c675567d2a58f0b07cef09c13d` (`user_id`),
  CONSTRAINT `FK_259bf9825d9d198608d1b46b0b5` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_4c675567d2a58f0b07cef09c13d` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of comments
-- ----------------------------

-- ----------------------------
-- Table structure for `drafts`
-- ----------------------------
DROP TABLE IF EXISTS `drafts`;
CREATE TABLE `drafts` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `spot_id` varchar(255) DEFAULT NULL,
  `title` varchar(200) DEFAULT NULL,
  `content` text,
  `images` text,
  `fish_categories` text,
  `spot_evaluation` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_1cb719ae58a20f6609125c429e6` (`user_id`),
  CONSTRAINT `FK_1cb719ae58a20f6609125c429e6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of drafts
-- ----------------------------
INSERT INTO `drafts` VALUES ('7605b8e0-4a8b-4f62-90a7-9dcc23ec2ea1', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', null, 'q', 'q', '[\"file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Ffishing-spot-app-1097323d-114f-471d-9cf8-618069e6c625/ImagePicker/802f2ff7-b2f2-4416-b3b0-e62e66c7db48.jpeg\",\"file:///data/user/0/host.exp.exponent/cache/ExperienceData/%2540anonymous%252Ffishing-spot-app-1097323d-114f-471d-9cf8-618069e6c625/ImagePicker/09ea54be-f215-4595-9710-a73e8a5a463c.jpeg\"]', '[\"马口\",\"黑鱼\",\"白条\"]', '溪流', '2026-06-12 16:46:45.953752', '2026-06-12 16:51:05.000000');

-- ----------------------------
-- Table structure for `fishing_spots`
-- ----------------------------
DROP TABLE IF EXISTS `fishing_spots`;
CREATE TABLE `fishing_spots` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `address` varchar(200) NOT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `fishTypes` text COMMENT '推荐鱼种',
  `fishCategories` text COMMENT '聚合鱼获标签',
  `evaluations` text COMMENT '聚合评价标签',
  `post_count` int(11) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_b0f0e183836c05bd1093c63286` (`latitude`),
  KEY `IDX_de70e4978ede03838829f74681` (`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of fishing_spots
-- ----------------------------
INSERT INTO `fishing_spots` VALUES ('22aceb30-bb72-4b65-b4fe-9a01284cbde9', '太湖', '海淀区-西长安街', '39.91420000', '116.39790000', '[\"鲫鱼\",\"鲢鳙\"]', '[\"鲫鱼\",\"翘嘴\",\"鳜鱼\"]', '[\"水库\",\"新手友好\"]', '1', '2026-06-10 22:20:05.801042');
INSERT INTO `fishing_spots` VALUES ('65333cd9-f988-49b5-a460-a01b646ce48e', '明湖', '海淀区-西长安街', '39.90830000', '116.39390000', '[\"鲫鱼\",\"草鱼\",\"鲤鱼\"]', '[\"鲫鱼\",\"草鱼\",\"鲈鱼\",\"鳜鱼\"]', '[\"野钓\",\"新手友好\",\"溪流\"]', '1', '2026-06-10 22:20:05.798038');
INSERT INTO `fishing_spots` VALUES ('7fbf65ae-8180-4ef2-9c0e-a50a391e06e6', '前门护城河', '东城区-前门东大街', '39.89990000', '116.39740000', '[\"鲫鱼\",\"黑鱼\"]', '[\"黑鱼\"]', '[\"野钓\"]', '0', '2026-06-10 22:20:05.806509');
INSERT INTO `fishing_spots` VALUES ('f9e42fc1-3898-4289-8223-907fe28d2a94', '午门东侧水湾', '东城区-故宫东侧', '39.91290000', '116.40710000', '[\"草鱼\",\"鲤鱼\"]', '[\"草鱼\",\"鲫鱼\",\"黑鱼\",\"罗非\",\"白条\"]', '[\"黑坑\",\"野钓\",\"湖泊\",\"溪流\"]', '0', '2026-06-10 22:20:05.802922');

-- ----------------------------
-- Table structure for `likes`
-- ----------------------------
DROP TABLE IF EXISTS `likes`;
CREATE TABLE `likes` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_723da61de46f65bb3e3096750d` (`post_id`,`user_id`),
  KEY `FK_3f519ed95f775c781a254089171` (`user_id`),
  CONSTRAINT `FK_3f519ed95f775c781a254089171` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_741df9b9b72f328a6d6f63e79ff` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of likes
-- ----------------------------
INSERT INTO `likes` VALUES ('23829ba3-aea2-4b89-b04f-05f9aeb2b005', 'e33819eb-11c3-43a8-9c41-64f63be9004a', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 13:50:37.144848');
INSERT INTO `likes` VALUES ('2be8f558-915f-4d6e-a9f0-29f163e1a091', 'c223c454-bdeb-406d-b570-d0df5fb9e34d', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 14:11:58.282539');
INSERT INTO `likes` VALUES ('3efc402b-2981-4a10-a71b-3716d0cc2384', 'd31c845f-4101-48af-b8bd-821bc790adb8', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 16:07:59.414968');
INSERT INTO `likes` VALUES ('4380f453-2e86-4c52-bca7-7c7a22dd6284', 'f121ef32-6c2f-4b19-ab86-14285dd88afd', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 14:15:29.418213');
INSERT INTO `likes` VALUES ('77d48dc0-31c4-4531-b878-042835341bcb', 'f121ef32-6c2f-4b19-ab86-14285dd88afd', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 16:16:06.385958');
INSERT INTO `likes` VALUES ('934f0cd2-4a6a-41cd-ab8c-1877c7dc35a3', 'e33819eb-11c3-43a8-9c41-64f63be9004a', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 14:59:28.890676');
INSERT INTO `likes` VALUES ('c0d5f917-7ac6-408e-aee4-dcc3ca60baa7', 'c223c454-bdeb-406d-b570-d0df5fb9e34d', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 16:02:48.729537');
INSERT INTO `likes` VALUES ('d7aa586d-3503-44ad-a21b-9518733dd151', '1295166d-0b9a-40a2-89cb-e9eb46538b1c', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 14:58:14.386157');
INSERT INTO `likes` VALUES ('ed1349d5-c14e-4b44-a5d3-645b36e70ebe', '1295166d-0b9a-40a2-89cb-e9eb46538b1c', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 14:40:49.096397');

-- ----------------------------
-- Table structure for `posts`
-- ----------------------------
DROP TABLE IF EXISTS `posts`;
CREATE TABLE `posts` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `spot_id` varchar(255) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `content` text,
  `images` text,
  `fish_categories` text,
  `spot_evaluation` varchar(255) DEFAULT NULL,
  `like_count` int(11) NOT NULL DEFAULT '0',
  `comment_count` int(11) NOT NULL DEFAULT '0',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `FK_c4f9a7bd77b489e711277ee5986` (`user_id`),
  KEY `FK_f92ac1161f26fc5bf1f86b051fd` (`spot_id`),
  CONSTRAINT `FK_c4f9a7bd77b489e711277ee5986` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_f92ac1161f26fc5bf1f86b051fd` FOREIGN KEY (`spot_id`) REFERENCES `fishing_spots` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of posts
-- ----------------------------
INSERT INTO `posts` VALUES ('1295166d-0b9a-40a2-89cb-e9eb46538b1c', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '65333cd9-f988-49b5-a460-a01b646ce48e', '清爽的鱼', '大大的鱼，在中南海钓鱼。会不会被抓喔！', '[\"https://picsum.photos/seed/fishing-1/600/600\",\"https://picsum.photos/seed/fishing-2/600/600\"]', '[\"鲈鱼\",\"鳜鱼\"]', '溪流', '2', '0', '2026-06-12 13:59:37.020049', '2026-06-12 14:58:14.000000');
INSERT INTO `posts` VALUES ('803cdbe2-3e55-4169-b0a8-8d4a47dfd188', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', 'f9e42fc1-3898-4289-8223-907fe28d2a94', '穿上时装去钓鱼', 'WOW~', '[\"https://picsum.photos/seed/fishing-3/600/600\"]', '[\"草鱼\",\"黑鱼\"]', '湖泊', '0', '0', '2026-06-12 12:50:47.069246', '2026-06-12 16:05:53.542872');
INSERT INTO `posts` VALUES ('88faff94-b82f-40d6-8b5d-0c5ff6b0fbb2', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', 'f9e42fc1-3898-4289-8223-907fe28d2a94', '接口烟测分享', '今天鱼口不错 #鲫鱼 #野钓', '[]', '[\"鲫鱼\"]', '野钓', '0', '0', '2026-06-10 22:24:27.592293', '2026-06-10 22:24:27.592293');
INSERT INTO `posts` VALUES ('c223c454-bdeb-406d-b570-d0df5fb9e34d', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '22aceb30-bb72-4b65-b4fe-9a01284cbde9', '去滑雪吧', '没鱼', '[\"https://picsum.photos/seed/fishing-3/600/600\"]', '[\"翘嘴\",\"鳜鱼\"]', '新手友好', '2', '0', '2026-06-12 12:56:00.434718', '2026-06-12 16:02:48.000000');
INSERT INTO `posts` VALUES ('d31c845f-4101-48af-b8bd-821bc790adb8', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', 'f9e42fc1-3898-4289-8223-907fe28d2a94', 'b', 'v', '[\"https://picsum.photos/seed/fishing-1/600/600\",\"https://picsum.photos/seed/fishing-2/600/600\"]', '[\"罗非\",\"白条\",\"黑鱼\"]', '溪流', '1', '0', '2026-06-12 16:06:53.021252', '2026-06-12 16:07:59.000000');
INSERT INTO `posts` VALUES ('e33819eb-11c3-43a8-9c41-64f63be9004a', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '65333cd9-f988-49b5-a460-a01b646ce48e', '傍晚口很好', '鱼多爆护，人还少！速速来！ #鲫鱼 #草鱼 #野钓', '[\"https://picsum.photos/seed/fishing-1/600/600\",\"https://picsum.photos/seed/fishing-2/600/600\"]', '[\"鲫鱼\",\"草鱼\"]', '野钓', '8', '0', '2026-06-10 22:20:05.810689', '2026-06-12 14:59:28.000000');
INSERT INTO `posts` VALUES ('f121ef32-6c2f-4b19-ab86-14285dd88afd', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '22aceb30-bb72-4b65-b4fe-9a01284cbde9', '水面宽，适合慢守', '今天用玉米守到一尾大鲤，风小的时候更舒服。 #鲫鱼 #水库', '[\"https://picsum.photos/seed/fishing-3/600/600\"]', '[\"鲫鱼\"]', '水库', '5', '0', '2026-06-10 22:20:05.813309', '2026-06-12 16:16:06.000000');

-- ----------------------------
-- Table structure for `users`
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `phone` varchar(11) NOT NULL COMMENT '手机号',
  `nickname` varchar(50) NOT NULL DEFAULT '钓友',
  `avatar` varchar(255) DEFAULT NULL COMMENT '头像URL',
  `password_hash` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_a000cca60bcf04454e72769949` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES ('0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '18800000000', '空军1号', 'https://api.dicebear.com/7.x/avataaars/png?seed=fishing', '$2a$10$DjDlZFLSokZG1XEw/Um.RuxYOvz1yUUcMlsca2/iqmWiCEj.n5rv2', '2026-06-10 22:20:05.783027', '2026-06-10 22:20:05.783027');
INSERT INTO `users` VALUES ('0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '13194978982', '钓友9910', null, '$2a$10$KGQAPasqd/.uK4dnR5m5XuR73f2If0ypK99v6eAv2cg.G.BXQ2SCm', '2026-06-12 14:56:56.689335', '2026-06-12 14:56:56.689335');
INSERT INTO `users` VALUES ('132741f7-8a9f-4923-94c5-c34c49b6c4bd', '18201458982', '钓友6219', null, '$2a$10$CQD2l51Ydjnm2cFgLJLgeu2GmUIm7Frj/wFnCZqb.f7Lq5EBbrRgG', '2026-06-11 10:53:47.321315', '2026-06-11 10:53:47.321315');
