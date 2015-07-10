NODE_ENV=test webpack
cp -R build/* ../ltest1/www/
cd ../ltest1
cordova prepare
