UPDATE languages 
SET compile_cmd = '/usr/local/openjdk13/bin/javac -J-Xmx64m -J-XX:MaxMetaspaceSize=64m -J-XX:ReservedCodeCacheSize=32m -J-XX:+UseSerialGC %s Main.java', 
    run_cmd = '/usr/local/openjdk13/bin/java -Xmx64m -XX:MaxMetaspaceSize=64m -XX:ReservedCodeCacheSize=32m -XX:+UseSerialGC Main' 
WHERE id = 62;
