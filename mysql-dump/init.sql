CREATE DATABASE cts;
USE cts;
CREATE TABLE `uids` (
  `uid` varchar(64) NOT NULL,
  `activated` tinyint(1) NOT NULL DEFAULT 1,
  `activated_at` date DEFAULT NULL,
  `expired_at` date DEFAULT NULL,
  PRIMARY KEY (`uid`)
);
GRANT SELECT ON `cts`.`uids` TO `relay`@`%`;

insert into uids(uid, activated) values('simpnictestmid00002', '1');
insert into uids(uid, activated) values('COLUL3XYBWHOSGDBBGUS', '1');