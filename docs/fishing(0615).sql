/*
 Navicat Premium Data Transfer

 Source Server         : local
 Source Server Type    : MySQL
 Source Server Version : 100137
 Source Host           : localhost:3306
 Source Schema         : fishing

 Target Server Type    : MySQL
 Target Server Version : 100137
 File Encoding         : 65001

 Date: 15/06/2026 07:45:28
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for comments
-- ----------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments` (
  `id` varchar(36) NOT NULL,
  `post_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `parent_id` varchar(255) DEFAULT NULL,
  `reply_to_user_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_259bf9825d9d198608d1b46b0b5` (`post_id`),
  KEY `FK_4c675567d2a58f0b07cef09c13d` (`user_id`),
  KEY `FK_d6f93329801a93536da4241e386` (`parent_id`),
  KEY `FK_b7c58a347104bdc579d508fb52f` (`reply_to_user_id`),
  CONSTRAINT `FK_259bf9825d9d198608d1b46b0b5` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_4c675567d2a58f0b07cef09c13d` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_b7c58a347104bdc579d508fb52f` FOREIGN KEY (`reply_to_user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `FK_d6f93329801a93536da4241e386` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of comments
-- ----------------------------
BEGIN;
INSERT INTO `comments` (`id`, `post_id`, `user_id`, `content`, `created_at`, `parent_id`, `reply_to_user_id`) VALUES ('0c75709b-3a11-47a7-b373-ed75747875fe', '9b928d35-f223-4e95-b731-be82df607b8d', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '不错', '2026-06-15 00:12:59.275075', NULL, NULL);
INSERT INTO `comments` (`id`, `post_id`, `user_id`, `content`, `created_at`, `parent_id`, `reply_to_user_id`) VALUES ('fbecf9cb-e127-48fc-8ebe-6b9cb903e550', '9b928d35-f223-4e95-b731-be82df607b8d', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '哈哈', '2026-06-15 00:13:13.557888', '0c75709b-3a11-47a7-b373-ed75747875fe', '132741f7-8a9f-4923-94c5-c34c49b6c4bd');
COMMIT;

-- ----------------------------
-- Table structure for drafts
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
BEGIN;
INSERT INTO `drafts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `created_at`, `updated_at`) VALUES ('0a6d6a8e-059e-4086-9b4a-076d1e00397b', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', 'amap_BY00004E1T', '', '', '[]', '[]', '', '2026-06-15 07:44:06.489580', '2026-06-15 07:44:06.489580');
COMMIT;

-- ----------------------------
-- Table structure for fishing_spots
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
  `source` varchar(20) NOT NULL DEFAULT 'admin' COMMENT '钓点来源：admin/user/amap',
  `source_poi_id` varchar(100) DEFAULT NULL COMMENT '第三方 POI ID',
  `status` varchar(20) NOT NULL DEFAULT 'verified' COMMENT 'candidate/verified',
  `confidence` decimal(5,2) NOT NULL DEFAULT '1.00',
  `submitted_by` varchar(36) DEFAULT NULL COMMENT '用户提交人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8555598c7289108a4e34e00ca7` (`source_poi_id`),
  KEY `IDX_b0f0e183836c05bd1093c63286` (`latitude`),
  KEY `IDX_de70e4978ede03838829f74681` (`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of fishing_spots
-- ----------------------------
BEGIN;
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('11be3b48-e6f5-48c0-bcc7-15dffc44feee', '府河', '双流区', 30.49115000, 104.06206100, '[]', '[\"鲫鱼\"]', '[\"新手友好\"]', 0, '2026-06-14 14:27:38.965673', 'amap', 'B0FFGGYTTA', 'verified', 0.75, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('131fa447-ed9a-4073-86f2-25f9bc93b504', '南湖路', '双流区', 30.49735100, 104.06207600, '[]', '[\"草鱼\",\"鳜鱼\"]', '[\"斤塘\"]', 0, '2026-06-14 14:17:21.130686', 'amap', 'BZA6N500EN', 'verified', 0.75, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('19ae676a-48ee-46e2-88e2-9cfec273e99f', '府河', '四川省成都市双流区华阳街道锦江绿道', 30.46913400, 104.05410000, '[]', '[]', '[]', 0, '2026-06-15 07:42:35.241091', 'user', NULL, 'pending_review', 0.50, '132741f7-8a9f-4923-94c5-c34c49b6c4bd');
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('22aceb30-bb72-4b65-b4fe-9a01284cbde9', '太湖', '海淀区-西长安街', 39.91420000, 116.39790000, '[\"鲫鱼\",\"鲢鳙\"]', '[\"鲫鱼\",\"翘嘴\",\"鳜鱼\"]', '[\"水库\",\"新手友好\"]', 1, '2026-06-10 22:20:05.801042', 'admin', NULL, 'verified', 1.00, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('2b7341c9-7cf0-437d-b712-74a87dc17fbe', '海合安成都极地海洋公园', '天府新区海洋路68号', 30.49487000, 104.07328700, '[]', '[\"马口\",\"鲈鱼\",\"白条\"]', '[\"湖泊\"]', 0, '2026-06-14 15:48:32.598648', 'amap', 'B001C805MI', 'verified', 0.75, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('590069e8-6517-4e53-8ea9-e91a5ae44f71', '湖心岛', '天星岛西北侧160米', 30.40017300, 104.09365100, '[\"白条\",\"马口\",\"翘嘴\",\"鲤鱼\",\"黑鱼\",\"鲢鳙\"]', '[\"白条\",\"马口\",\"翘嘴\",\"鲤鱼\",\"黑鱼\",\"鲢鳙\"]', '[\"新手友好\"]', 0, '2026-06-15 00:17:02.467273', 'amap', 'B0KUBRY4RU', 'verified', 0.75, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('65333cd9-f988-49b5-a460-a01b646ce48e', '明湖', '海淀区-西长安街', 39.90830000, 116.39390000, '[\"鲫鱼\",\"草鱼\",\"鲤鱼\"]', '[\"鲫鱼\",\"草鱼\",\"鲈鱼\",\"鳜鱼\"]', '[\"野钓\",\"新手友好\",\"溪流\"]', 1, '2026-06-10 22:20:05.798038', 'admin', NULL, 'verified', 1.00, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('7fbf65ae-8180-4ef2-9c0e-a50a391e06e6', '前门护城河', '东城区-前门东大街', 39.89990000, 116.39740000, '[\"鲫鱼\",\"黑鱼\"]', '[\"黑鱼\"]', '[\"野钓\"]', 0, '2026-06-10 22:20:05.806509', 'admin', NULL, 'verified', 1.00, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('c0c6643a-9975-4388-924c-e5ba0ffea256', '府河', '双流区', 30.47664100, 104.05355100, '[]', '[\"黑鱼\",\"马口\"]', '[\"新手友好\"]', 0, '2026-06-14 15:27:31.428992', 'amap', 'B0HR5UB9VZ', 'verified', 0.75, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('d0491860-938a-4d4b-9863-aabf55408932', '府河', '四川省成都市双流区华阳街道锦江绿道', 30.48374900, 104.06626200, '[]', '[]', '[]', 0, '2026-06-15 07:41:27.384529', 'user', NULL, 'pending_review', 0.50, '132741f7-8a9f-4923-94c5-c34c49b6c4bd');
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('ecdd3074-21b0-4b3a-8775-5f00b3519422', '南湖湿地公园-钓鱼台', '华阳街道南湖北路与南湖东路交叉路口东北角南湖湿地公园', 30.50103600, 104.05003800, '[\"翘嘴\",\"鲤鱼\",\"鳜鱼\",\"马口\",\"白条\",\"鲢鳙\",\"青鱼\"]', '[\"翘嘴\",\"鲤鱼\",\"鳜鱼\",\"马口\",\"白条\",\"鲢鳙\",\"青鱼\"]', '[\"溪流\"]', 0, '2026-06-14 23:17:15.393509', 'amap', 'B0H3TCLO0M', 'verified', 0.75, NULL);
INSERT INTO `fishing_spots` (`id`, `name`, `address`, `latitude`, `longitude`, `fishTypes`, `fishCategories`, `evaluations`, `post_count`, `created_at`, `source`, `source_poi_id`, `status`, `confidence`, `submitted_by`) VALUES ('f9e42fc1-3898-4289-8223-907fe28d2a94', '午门东侧水湾', '东城区-故宫东侧', 39.91290000, 116.40710000, '[\"草鱼\",\"鲤鱼\"]', '[\"草鱼\",\"鲫鱼\",\"黑鱼\",\"罗非\",\"白条\"]', '[\"黑坑\",\"野钓\",\"湖泊\",\"溪流\"]', 0, '2026-06-10 22:20:05.802922', 'admin', NULL, 'verified', 1.00, NULL);
COMMIT;

-- ----------------------------
-- Table structure for likes
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
BEGIN;
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('11eae6b7-d956-4e05-8c30-45988ea78107', '8b68f9fa-941e-42ab-ace3-6ade1a5f0efe', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '2026-06-15 06:46:12.741054');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('1b83e4dc-5e78-4dfa-9fdd-b1c183abb9e7', 'dd69eaab-3e97-4bf9-8f4b-2643dcd62d3c', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '2026-06-15 00:17:28.061824');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('23829ba3-aea2-4b89-b04f-05f9aeb2b005', 'e33819eb-11c3-43a8-9c41-64f63be9004a', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 13:50:37.144848');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('2bba2da1-d9e3-46db-a057-ec23c40c6488', '9b928d35-f223-4e95-b731-be82df607b8d', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '2026-06-15 00:13:24.682124');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('2be8f558-915f-4d6e-a9f0-29f163e1a091', 'c223c454-bdeb-406d-b570-d0df5fb9e34d', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 14:11:58.282539');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('2f1dac83-e48d-4902-a66b-21c6c0da5d0a', '1b7188aa-3762-4aaf-a0c0-597e393643f8', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '2026-06-15 06:51:51.470512');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('3efc402b-2981-4a10-a71b-3716d0cc2384', 'd31c845f-4101-48af-b8bd-821bc790adb8', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 16:07:59.414968');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('4380f453-2e86-4c52-bca7-7c7a22dd6284', 'f121ef32-6c2f-4b19-ab86-14285dd88afd', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 14:15:29.418213');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('77d48dc0-31c4-4531-b878-042835341bcb', 'f121ef32-6c2f-4b19-ab86-14285dd88afd', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 16:16:06.385958');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('934f0cd2-4a6a-41cd-ab8c-1877c7dc35a3', 'e33819eb-11c3-43a8-9c41-64f63be9004a', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 14:59:28.890676');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('c0d5f917-7ac6-408e-aee4-dcc3ca60baa7', 'c223c454-bdeb-406d-b570-d0df5fb9e34d', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 16:02:48.729537');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('ce8f2c99-7623-4282-9017-53a69cea40b0', '03ad44e8-655e-426a-8a6f-2fb3fc73afb1', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '2026-06-14 23:19:28.578033');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('d7aa586d-3503-44ad-a21b-9518733dd151', '1295166d-0b9a-40a2-89cb-e9eb46538b1c', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '2026-06-12 14:58:14.386157');
INSERT INTO `likes` (`id`, `post_id`, `user_id`, `created_at`) VALUES ('ed1349d5-c14e-4b44-a5d3-645b36e70ebe', '1295166d-0b9a-40a2-89cb-e9eb46538b1c', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '2026-06-12 14:40:49.096397');
COMMIT;

-- ----------------------------
-- Table structure for posts
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
BEGIN;
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('03ad44e8-655e-426a-8a6f-2fb3fc73afb1', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', 'ecdd3074-21b0-4b3a-8775-5f00b3519422', '南湖公园钓鱼了有人吗', '周末好无聊呀', '[\"https://axe-video-1257242485.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260614/1781450150377-827341271.jpg\"]', '[\"翘嘴\",\"鲤鱼\",\"鳜鱼\",\"马口\",\"白条\",\"鲢鳙\",\"青鱼\"]', '溪流', 1, 0, '2026-06-14 23:17:15.399079', '2026-06-14 23:19:28.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('1295166d-0b9a-40a2-89cb-e9eb46538b1c', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '65333cd9-f988-49b5-a460-a01b646ce48e', '清爽的鱼', '大大的鱼，在中南海钓鱼。会不会被抓喔！', '[\"https://picsum.photos/seed/fishing-1/600/600\",\"https://picsum.photos/seed/fishing-2/600/600\"]', '[\"鲈鱼\",\"鳜鱼\"]', '溪流', 2, 0, '2026-06-12 13:59:37.020049', '2026-06-12 14:58:14.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('1b7188aa-3762-4aaf-a0c0-597e393643f8', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '131fa447-ed9a-4073-86f2-25f9bc93b504', '精彩钓点分享', '鱼情正好，快来一起垂钓吧！', '[]', '[\"草鱼\",\"鳜鱼\"]', '斤塘', 1, 0, '2026-06-14 14:17:21.137623', '2026-06-15 06:51:51.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('397d6879-c3eb-4d79-8a19-5f8775d00e42', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', 'c0c6643a-9975-4388-924c-e5ba0ffea256', 'vvvv', 'vv', '[\"https://axe-video-1257242485.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260614/1781421990842-212711066.jpg\"]', '[\"黑鱼\",\"马口\"]', '新手友好', 0, 0, '2026-06-14 15:27:31.433605', '2026-06-14 15:27:31.433605');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('803cdbe2-3e55-4169-b0a8-8d4a47dfd188', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', 'f9e42fc1-3898-4289-8223-907fe28d2a94', '穿上时装去钓鱼', 'WOW~', '[\"https://picsum.photos/seed/fishing-3/600/600\"]', '[\"草鱼\",\"黑鱼\"]', '湖泊', 0, 0, '2026-06-12 12:50:47.069246', '2026-06-12 16:05:53.542872');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('88faff94-b82f-40d6-8b5d-0c5ff6b0fbb2', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', 'f9e42fc1-3898-4289-8223-907fe28d2a94', '接口烟测分享', '今天鱼口不错 #鲫鱼 #野钓', '[]', '[\"鲫鱼\"]', '野钓', 0, 0, '2026-06-10 22:24:27.592293', '2026-06-10 22:24:27.592293');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('8b68f9fa-941e-42ab-ace3-6ade1a5f0efe', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '2b7341c9-7cf0-437d-b712-74a87dc17fbe', '水门奇遇，静钓心湖', '在废墟与碧水间垂钓，仿佛进入童话世界。一扇孤门立于水中，倒影如梦。静待鱼儿上钩，更觉心灵被自然治愈，浮躁尽消。', '[\"https://axe-video-1257242485.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260614/1781423270117-928668331.jpg\"]', '[\"马口\",\"鲈鱼\",\"白条\"]', '湖泊', 1, 0, '2026-06-14 15:48:32.602961', '2026-06-15 06:46:12.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('9b928d35-f223-4e95-b731-be82df607b8d', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '11be3b48-e6f5-48c0-bcc7-15dffc44feee', 'v', 'c', '[]', '[\"鲫鱼\"]', '新手友好', 1, 2, '2026-06-14 14:27:38.971284', '2026-06-15 00:13:24.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('c223c454-bdeb-406d-b570-d0df5fb9e34d', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '22aceb30-bb72-4b65-b4fe-9a01284cbde9', '去滑雪吧', '没鱼', '[\"https://picsum.photos/seed/fishing-3/600/600\"]', '[\"翘嘴\",\"鳜鱼\"]', '新手友好', 2, 0, '2026-06-12 12:56:00.434718', '2026-06-12 16:02:48.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('d31c845f-4101-48af-b8bd-821bc790adb8', '0e8587cd-84df-43b0-82eb-9d44ccdc22b2', 'f9e42fc1-3898-4289-8223-907fe28d2a94', 'b', 'v', '[\"https://picsum.photos/seed/fishing-1/600/600\",\"https://picsum.photos/seed/fishing-2/600/600\"]', '[\"罗非\",\"白条\",\"黑鱼\"]', '溪流', 1, 0, '2026-06-12 16:06:53.021252', '2026-06-12 16:07:59.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('dd69eaab-3e97-4bf9-8f4b-2643dcd62d3c', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '590069e8-6517-4e53-8ea9-e91a5ae44f71', '水门奇遇，静钓时光', '在碧波荡漾的湖心，一扇孤门静立水中，仿佛通往另一个世界。垂钓于此，心随水动，鱼线轻颤间，竟觉天地皆入梦。', '[\"https://axe-video-1257242485.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260615/1781453795717-78720174.jpg\"]', '[\"白条\",\"马口\",\"翘嘴\",\"鲤鱼\"]', '新手友好', 1, 0, '2026-06-15 00:17:02.471447', '2026-06-15 00:17:28.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('e33819eb-11c3-43a8-9c41-64f63be9004a', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '65333cd9-f988-49b5-a460-a01b646ce48e', '傍晚口很好', '鱼多爆护，人还少！速速来！ #鲫鱼 #草鱼 #野钓', '[\"https://picsum.photos/seed/fishing-1/600/600\",\"https://picsum.photos/seed/fishing-2/600/600\"]', '[\"鲫鱼\",\"草鱼\"]', '野钓', 8, 0, '2026-06-10 22:20:05.810689', '2026-06-12 14:59:28.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('f121ef32-6c2f-4b19-ab86-14285dd88afd', '0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '22aceb30-bb72-4b65-b4fe-9a01284cbde9', '水面宽，适合慢守', '今天用玉米守到一尾大鲤，风小的时候更舒服。 #鲫鱼 #水库', '[\"https://picsum.photos/seed/fishing-3/600/600\"]', '[\"鲫鱼\"]', '水库', 5, 0, '2026-06-10 22:20:05.813309', '2026-06-12 16:16:06.000000');
INSERT INTO `posts` (`id`, `user_id`, `spot_id`, `title`, `content`, `images`, `fish_categories`, `spot_evaluation`, `like_count`, `comment_count`, `created_at`, `updated_at`) VALUES ('f53d6280-4f30-432c-8e9e-f6b8d54ab9d4', '132741f7-8a9f-4923-94c5-c34c49b6c4bd', '590069e8-6517-4e53-8ea9-e91a5ae44f71', '音乐与自然的共鸣', '在静谧湖畔，我以钓竿为笔，水面为纸，记录下每一次心跳与鱼讯的对话。耐心是垂钓的灵魂，而收获的不仅是鱼，更是内心的宁静与满足。', '[\"https://axe-video-1257242485.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260615/1781453947310-376834464.jpg\"]', '[\"黑鱼\",\"鲢鳙\"]', '新手友好', 0, 0, '2026-06-15 00:19:29.065346', '2026-06-15 00:19:29.065346');
COMMIT;

-- ----------------------------
-- Table structure for users
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
BEGIN;
INSERT INTO `users` (`id`, `phone`, `nickname`, `avatar`, `password_hash`, `created_at`, `updated_at`) VALUES ('0dccaa1e-cc71-46e9-8ee7-f251e29ef6d7', '18800000000', '空军1号', 'https://api.dicebear.com/7.x/avataaars/png?seed=fishing', '$2a$10$DjDlZFLSokZG1XEw/Um.RuxYOvz1yUUcMlsca2/iqmWiCEj.n5rv2', '2026-06-10 22:20:05.783027', '2026-06-10 22:20:05.783027');
INSERT INTO `users` (`id`, `phone`, `nickname`, `avatar`, `password_hash`, `created_at`, `updated_at`) VALUES ('0e8587cd-84df-43b0-82eb-9d44ccdc22b2', '13194978982', '钓友9910', NULL, '$2a$10$KGQAPasqd/.uK4dnR5m5XuR73f2If0ypK99v6eAv2cg.G.BXQ2SCm', '2026-06-12 14:56:56.689335', '2026-06-12 14:56:56.689335');
INSERT INTO `users` (`id`, `phone`, `nickname`, `avatar`, `password_hash`, `created_at`, `updated_at`) VALUES ('132741f7-8a9f-4923-94c5-c34c49b6c4bd', '18201458982', '钓友6219', NULL, '$2a$10$CQD2l51Ydjnm2cFgLJLgeu2GmUIm7Frj/wFnCZqb.f7Lq5EBbrRgG', '2026-06-11 10:53:47.321315', '2026-06-11 10:53:47.321315');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
