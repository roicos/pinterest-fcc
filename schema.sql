Create table if not exists users (id serial primary key, token varchar (255), email varchar (100), username varchar(100));

Create table if not exists pictures (id serial primary key, userid int not null, link varchar (255) not null, description varchar (255));

Create table if not exists favorites (id serial primary key, userid int not null, pictureid int not null);